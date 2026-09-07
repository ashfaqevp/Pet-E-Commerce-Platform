-- ---------------------------------------------------------------------------
-- Admin storage audit — classifies storage.objects against image references.
-- security definer: storage.objects is not exposed through PostgREST.
-- ---------------------------------------------------------------------------

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
  left join ref_keys r
    on r.key = o.bucket_id || '/' || o.name or r.key = o.name
  left join products p
    on p.id::text = split_part(o.name, '/', 2);
$$;


create or replace function public.admin_storage_summary()
returns table (status text, files bigint, bytes bigint)
language sql
security definer
set search_path = public
stable
as $$
  select c.status, count(*)::bigint, coalesce(sum(c.bytes), 0)::bigint
  from public.admin_storage_classified() c
  group by c.status;
$$;


create or replace function public.admin_storage_objects(
  p_status text default null,
  p_search text default null,
  p_limit  int  default 60,
  p_offset int  default 0
)
returns table (
  bucket       text,
  path         text,
  bytes        bigint,
  mimetype     text,
  status       text,
  product_name text,
  created_at   timestamptz,
  total_count  bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with filtered as (
    select c.*
    from public.admin_storage_classified() c
    where (p_status is null or p_status = '' or c.status = p_status)
      and (p_search is null or p_search = ''
           or c.path ilike '%' || p_search || '%'
           or c.product_name ilike '%' || p_search || '%')
  )
  select f.bucket, f.path, f.bytes, f.mimetype, f.status,
         f.product_name, f.created_at,
         count(*) over ()::bigint
  from filtered f
  order by f.bytes desc
  limit greatest(coalesce(p_limit, 60), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


create or replace function public.admin_storage_orphans()
returns table (bucket text, path text, bytes bigint)
language sql
security definer
set search_path = public
stable
as $$
  select c.bucket, c.path, c.bytes
  from public.admin_storage_classified() c
  where c.status <> 'in_use';
$$;


-- Server routes call these with the service role key. Nothing else may.
revoke all on function public.admin_storage_classified()                    from public, anon, authenticated;
revoke all on function public.admin_storage_summary()                       from public, anon, authenticated;
revoke all on function public.admin_storage_objects(text, text, int, int)   from public, anon, authenticated;
revoke all on function public.admin_storage_orphans()                       from public, anon, authenticated;

grant execute on function public.admin_storage_classified()                  to service_role;
grant execute on function public.admin_storage_summary()                     to service_role;
grant execute on function public.admin_storage_objects(text, text, int, int) to service_role;
grant execute on function public.admin_storage_orphans()                     to service_role;
