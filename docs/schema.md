# Database Schema

## Tables

- addresses
- cart_items
- order_items
- orders
- products
- profiles

## addresses

| Column           | Type                       | Nullable | Default            |
|------------------|----------------------------|----------|--------------------|
| id               | uuid                       | NO       | gen_random_uuid()  |
| user_id          | uuid                       | NO       |                    |
| full_name        | text                       | NO       |                    |
| phone            | text                       | NO       |                    |
| address_line_1   | text                       | NO       |                    |
| address_line_2   | text                       | YES      |                    |
| city             | text                       | NO       |                    |
| state            | text                       | NO       |                    |
| postal_code      | text                       | NO       |                    |
| country          | text                       | NO       |                    |
| is_default       | boolean                    | NO       | false              |
| created_at       | timestamp with time zone   | YES      | now()              |
| updated_at       | timestamp with time zone   | YES      | now()              |

## cart_items

| Column     | Type                     | Nullable | Default           |
|------------|--------------------------|----------|-------------------|
| id         | uuid                     | NO       | gen_random_uuid() |
| user_id    | uuid                     | NO       | auth.uid()        |
| product_id | uuid                     | NO       |                   |
| quantity   | integer                  | NO       | 1                 |
| created_at | timestamp with time zone | YES      | now()             |
| updated_at | timestamp with time zone | YES      | now()             |

## order_items

| Column            | Type                     | Nullable | Default           |
|-------------------|--------------------------|----------|-------------------|
| id                | uuid                     | NO       | gen_random_uuid() |
| order_id          | uuid                     | NO       |                   |
| product_id        | uuid                     | NO       |                   |
| product_name      | text                     | NO       |                   |
| product_thumbnail | text                     | YES      |                   |
| unit_price        | numeric                  | NO       |                   |
| quantity          | integer                  | NO       |                   |
| total_price       | numeric                  | NO       |                   |
| created_at        | timestamp with time zone | YES      | now()             |

## orders

| Column           | Type                     | Nullable | Default           |
|------------------|--------------------------|----------|-------------------|
| id               | uuid                     | NO       | gen_random_uuid() |
| user_id          | uuid                     | NO       |                   |
| status           | text                     | NO       | 'pending'         |
| payment_status   | text                     | NO       | 'unpaid'          |
| payment_method   | text                     | YES      |                   |
| subtotal         | numeric                  | NO       |                   |
| shipping_fee     | numeric                  | NO       | 0                 |
| tax              | numeric                  | NO       | 0                 |
| total            | numeric                  | NO       |                   |
| shipping_address | jsonb                    | NO       |                   |
| billing_address  | jsonb                    | YES      |                   |
| created_at       | timestamp with time zone | YES      | now()             |
| updated_at       | timestamp with time zone | YES      | now()             |
| tran_ref         | text                     | YES      |                   |
| payment_provider | text                     | YES      | 'paytabs'         |
| paid_at          | timestamp with time zone | YES      |                   |

## products

| Column          | Type                       | Nullable | Default            |
|-----------------|----------------------------|----------|--------------------|
| id              | uuid                       | NO       | gen_random_uuid()  |
| base_product_id | uuid                       | YES      |                    |
| name            | text                       | NO       |                    |
| description     | text                       | YES      |                    |
| retail_price    | numeric                    | NO       |                    |
| stock           | integer                    | YES      | 0                  |
| pet_type        | text                       | NO       |                    |
| product_type    | text                       | NO       |                    |
| age             | text                       | YES      |                    |
| unit            | text                       | YES      |                    |
| size            | text                       | YES      |                    |
| flavour         | text                       | YES      |                    |
| image_urls      | ARRAY                      | YES      |                    |
| is_active       | boolean                    | YES      | true               |
| created_at      | timestamp with time zone   | YES      | now()              |
| updated_at      | timestamp with time zone   | YES      | now()              |
| stock_quantity  | numeric                    | YES      |                    |
| thumbnail_url   | text                       | YES      |                    |
| default_rating  | numeric                    | NO       | 0.0                |
| is_featured     | boolean                    | NO       | false              |

## profiles

| Column     | Type                     | Nullable | Default   |
|------------|--------------------------|----------|-----------|
| id         | uuid                     | NO       |           |
| phone      | text                     | YES      |           |
| role       | text                     | YES      | 'customer'|
| created_at | timestamp with time zone | YES      | now()     |
| updated_at | timestamp with time zone | YES      | now()     |



addresses =>

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "address_line_1",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "address_line_2",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "city",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "state",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "postal_code",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "country",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "is_default",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]


cart_items =>

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "auth.uid()"
  },
  {
    "column_name": "product_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "1"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]


order_items =>

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "column_name": "order_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "product_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "product_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "product_thumbnail",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "unit_price",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "total_price",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]

orders => 

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'pending'::text"
  },
  {
    "column_name": "payment_status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'unpaid'::text"
  },
  {
    "column_name": "payment_method",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "subtotal",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "shipping_fee",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "column_name": "tax",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "column_name": "total",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "shipping_address",
    "data_type": "jsonb",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "billing_address",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "tran_ref",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "payment_provider",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'paytabs'::text"
  },
  {
    "column_name": "paid_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  }
]

products =>

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "column_name": "base_product_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "retail_price",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "stock",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "column_name": "pet_type",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "product_type",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "age",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "unit",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "size",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "flavour",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "image_urls",
    "data_type": "ARRAY",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": "true"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "stock_quantity",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "thumbnail_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "default_rating",
    "data_type": "numeric",
    "is_nullable": "NO",
    "column_default": "0.0"
  },
  {
    "column_name": "is_featured",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false"
  }
]

profiles =>

[
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "phone",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'customer'::text"
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]
