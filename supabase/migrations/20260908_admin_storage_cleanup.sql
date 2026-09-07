-- ---------------------------------------------------------------------------
-- Storage cleanup, part 2 — stop orphans being created.
--
-- 1. admin_storage_orphans() gains an age guard so an automatic sweep cannot
--    delete a file in the window between "uploaded" and "row saved".
-- 2. admin_storage_keys_in_use() answers "is this exact key still referenced?"
--    for the release routes, using the same reference list as the classifier.
--    (That shared-list claim is superseded — see 20260909_admin_storage_ref_keys.sql.)
--
-- Run this AFTER 20260907_admin_storage_audit.sql.
-- ---------------------------------------------------------------------------

-- The zero-argument version must go, or Postgres keeps both overloads and a
-- no-argument call becomes ambiguous.
drop function if exists public.admin_storage_orphans();

create or replace function public.admin_storage_orphans(p_min_age_minutes int default 60)
returns table (bucket text, path text, bytes bigint)
language sql
security definer
set search_path = public
set statement_timeout = '120s'
stable
as $$
  select c.bucket, c.path, c.bytes
  from public.admin_storage_classified() c
  where c.status <> 'in_use'
    and c.created_at < now() - make_interval(mins => greatest(coalesce(p_min_age_minutes, 60), 0));
$$;

revoke all on function public.admin_storage_orphans(int) from public, anon, authenticated;
grant execute on function public.admin_storage_orphans(int) to service_role;


-- Given a list of 'bucket/path' keys, return the ones something still points at.
--
-- SUPERSEDED by 20260909_admin_storage_ref_keys.sql, which moved the reference
-- list into admin_storage_ref_keys() and widened it. The body below is the
-- pre-refactor one — do not replay this file, it would revert keys_in_use.
create or replace function public.admin_storage_keys_in_use(p_keys text[])
returns table (key text)
language sql
security definer
set search_path = public, storage
stable
as $$
  with referenced as (
    select unnest(image_urls)  as url from products
    union all select thumbnail_url     from products
    union all select desktop           from banners
    union all select mobile            from banners
    union all select logo_url          from brands
    union all select image_url         from pet_types
    union all select avatar_url        from profiles
    union all select product_thumbnail from order_items
  ),
  ref_keys as (
    select distinct replace(substring(split_part(url, '?', 1)
      from '/storage/v1/object/(?:public/|sign/|authenticated/)?(.*)$'), '%20', ' ') as key
    from referenced
    where url is not null and url <> ''
  )
  select k.key
  from unnest(p_keys) as k(key)
  where exists (
    select 1 from ref_keys r
    -- Second arm mirrors the classifier's bucket-less join: 'a/b/c.jpg' -> 'b/c.jpg'.
    where r.key = k.key
       or r.key = substr(k.key, strpos(k.key, '/') + 1)
  );
$$;

revoke all on function public.admin_storage_keys_in_use(text[]) from public, anon, authenticated;
grant execute on function public.admin_storage_keys_in_use(text[]) to service_role;
