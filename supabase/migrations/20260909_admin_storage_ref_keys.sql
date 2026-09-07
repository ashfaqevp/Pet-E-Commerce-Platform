-- ---------------------------------------------------------------------------
-- Storage cleanup, part 3 — one reference-key set, two callers.
--
-- admin_storage_classified() and admin_storage_keys_in_use() each carried their
-- own copy of the "what does something still point at?" query. The copies had
-- to be kept in step by hand, so admin_storage_ref_keys() now owns that set and
-- both functions select from it.
--
-- The set also grows here: products_backup.image_urls, products_backup.thumbnail_url
-- and products_import.thumbnail_url join the reference list, because the CSV
-- import left rows in those two tables pointing at live objects.
-- (products_import.image_urls is a raw comma-separated text column, not text[],
-- so it is deliberately not unnested here.)
--
-- Consequence, and the point of the change: an object referenced only by a
-- backup or import row now classifies as 'in_use', so admin_storage_orphans()
-- no longer returns it and the sweep no longer deletes it. Those objects stay
-- uncollectable for as long as the backup/import rows exist — that is intended.
--
-- ALREADY APPLIED. This file is the repo's record of a refactor that was run
-- by hand against the database; it is a faithful reconstruction, not a pending
-- change. Verify against the live definitions with:
--   select pg_get_functiondef('public.admin_storage_ref_keys'::regproc);
--
-- Run this AFTER 20260908_admin_storage_cleanup.sql.
-- ---------------------------------------------------------------------------

-- Every storage key any row still points at, normalised to 'bucket/path'
-- (query string stripped, %20 decoded). The single source — nothing else may
-- restate this list.
create or replace function public.admin_storage_ref_keys()
returns table (key text)
language sql
security definer
set search_path = public
stable
as $$
  with referenced as (
    select unnest(image_urls)  as url from products
    union all select thumbnail_url     from products
    union all select unnest(image_urls) from products_backup
    union all select thumbnail_url     from products_backup
    union all select thumbnail_url     from products_import
    union all select desktop           from banners
    union all select mobile            from banners
    union all select logo_url          from brands
    union all select image_url         from pet_types
    union all select avatar_url        from profiles
    union all select product_thumbnail from order_items
  )
  select distinct replace(substring(split_part(url, '?', 1)
    from '/storage/v1/object/(?:public/|sign/|authenticated/)?(.*)$'), '%20', ' ') as key
  from referenced
  where url is not null and url <> '';
$$;


-- Unchanged apart from the ref_keys CTE, which is now a call.
create or replace function public.admin_storage_classified()
returns table (
  bucket       text,
  path         text,
  bytes        bigint,
  mimetype     text,
  status       text,
  product_name text,
  created_at   timestamptz
)
language sql
security definer
set search_path = public, storage
stable
as $$
  select
    o.bucket_id::text,
    o.name::text,
    coalesce((o.metadata->>'size')::bigint, 0),
    coalesce(o.metadata->>'mimetype', '')::text,
    (case
      when r.key is not null        then 'in_use'
      when p.id  is not null        then 'orphan_replaced'
      when o.name like 'products/%' then 'orphan_deleted_product'
      else                               'unaccounted'
    end)::text,
    coalesce(p.name, '')::text,
    o.created_at
  from storage.objects o
  left join public.admin_storage_ref_keys() r
    on r.key = o.bucket_id || '/' || o.name or r.key = o.name
  left join products p
    on p.id::text = split_part(o.name, '/', 2);
$$;


-- Given a list of 'bucket/path' keys, return the ones something still points at.
create or replace function public.admin_storage_keys_in_use(p_keys text[])
returns table (key text)
language sql
security definer
set search_path = public
stable
as $$
  -- materialized, or the set is re-derived once per key.
  with ref as materialized (
    select r.key from public.admin_storage_ref_keys() r
  )
  select k.key
  from unnest(p_keys) as k(key)
  where exists (
    select 1 from ref r
    -- Second arm mirrors the classifier's bucket-less join: 'a/b/c.jpg' -> 'b/c.jpg'.
    where r.key = k.key
       or r.key = substr(k.key, strpos(k.key, '/') + 1)
  );
$$;


-- New function, so it is EXECUTE-to-public until told otherwise — and it
-- returns every referenced key, profiles.avatar_url included.
revoke all on function public.admin_storage_ref_keys() from public, anon, authenticated;
grant execute on function public.admin_storage_ref_keys() to service_role;
