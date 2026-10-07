-- ---------------------------------------------------------------------------
-- Guest checkout — orders without an account.
--
-- A guest order has no auth user, so `orders.user_id` must allow null. Guest
-- orders are never inserted from the browser: `server/api/orders/guest.post.ts`
-- writes them with the service role after re-pricing every line from
-- `products` and `site_config`. RLS is untouched — an anonymous visitor still
-- cannot insert into or read `orders` / `order_items` directly.
--
-- `customer_type` (already on the table, previously unused) is set to 'guest'
-- on those rows so the admin can tell them apart.
--
-- Check first — the orders schema is not in this repo. A trigger that derives
-- customer_type or anything else from profiles via user_id would overwrite
-- 'guest' or raise on a null; an admin read policy written as a join on
-- user_id would hide guest rows from /admin/orders:
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid in ('public.orders'::regclass, 'public.order_items'::regclass)
--      and not tgisinternal;
--   select tablename, policyname, cmd, qual, with_check from pg_policies
--    where tablename in ('orders', 'order_items');
--
-- NOT YET APPLIED. Run in the Supabase SQL editor before deploying the guest
-- checkout code; until then the guest endpoint fails with a not-null violation.
-- ---------------------------------------------------------------------------

alter table public.orders alter column user_id drop not null;

create index if not exists orders_customer_type_idx on public.orders (customer_type);
