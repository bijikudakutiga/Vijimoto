-- ============================================================
-- VIJIMOTO SUPER POS — SKEMA DATABASE (SUPABASE / POSTGRESQL)
-- ============================================================
-- Catatan umum:
-- * Semua tabel pakai uuid sebagai primary key (gen_random_uuid()).
-- * created_at/updated_at pakai timestamptz, auto default now().
-- * RLS (Row Level Security) diaktifkan per tabel — policy detail
--   disiapkan di file terpisah (rls_policies.sql) setelah skema ini
--   difinalkan, karena tergantung struktur role & permission final.
-- * Penomoran invoice/surat jalan/kas pakai fungsi counter per tahun
--   supaya mudah diformat ulang (INV/2026/08/0001, dst).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. ROLE & PERMISSION (mendukung role custom, dibuat via UI)
-- ------------------------------------------------------------
create table roles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,              -- 'super_admin','admin','kasir','finance','sales','gudang', atau custom
  label         text not null,                      -- nama tampilan, misal "Admin Gudang"
  is_system     boolean not null default false,     -- true untuk super_admin (tidak bisa dihapus/diubah)
  created_at    timestamptz not null default now()
);

-- Daftar menu/modul yang ada di sistem
create table modules (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,   -- 'dashboard','penjualan','customer','stok','kas','pengaturan'
  label         text not null
);

-- Hak akses per role per modul (view/create/edit/delete/approve)
create table role_permissions (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references roles(id) on delete cascade,
  module_id     uuid not null references modules(id) on delete cascade,
  can_view      boolean not null default false,
  can_create    boolean not null default false,
  can_edit      boolean not null default false,
  can_delete    boolean not null default false,
  can_approve   boolean not null default false,     -- misal approve diskon besar
  unique (role_id, module_id)
);

-- ------------------------------------------------------------
-- 2. USER / PROFIL (extends auth.users bawaan Supabase Auth)
-- ------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  role_id       uuid not null references roles(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Super admin awal (kudahijau664@gmail.com) dibuat manual sekali via
-- Supabase Auth + insert row profiles dengan role 'super_admin'.

-- ------------------------------------------------------------
-- 3. CUSTOMER
-- ------------------------------------------------------------
create table customers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,            -- nama customer / PT
  pic_name          text,                     -- opsional
  address           text not null,
  phone             text not null,
  email             text,                     -- opsional
  payment_track     text not null default 'baik'
                      check (payment_track in ('baik','waspada','buruk')),
  -- dihitung otomatis dari riwayat sales.payment_date vs due_date
  -- lewat trigger/fungsi, disimpan di sini supaya cepat ditampilkan di list
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_customers_name on customers using gin (to_tsvector('simple', name));

-- ------------------------------------------------------------
-- 4. PRODUK & SATUAN (mendukung konversi pcs <-> dus <-> karton)
-- ------------------------------------------------------------
create table products (
  id            uuid primary key default gen_random_uuid(),
  sku           text unique,
  name          text not null,
  base_unit     text not null default 'pcs',   -- satuan terkecil, semua stok disimpan dlm satuan ini
  price_sell    numeric(14,2) not null default 0,  -- harga jual per base_unit
  price_buy     numeric(14,2) default 0,
  min_stock     numeric(14,2) not null default 0,  -- ambang batas untuk alert stok kritis
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_products_name on products using gin (to_tsvector('simple', name));

-- Satuan turunan produk, misal: 1 dus = 12 pcs, 1 karton = 10 dus (=120 pcs)
create table product_units (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id) on delete cascade,
  unit_name         text not null,             -- 'pcs','dus','karton', dst
  conversion_to_base numeric(14,4) not null,   -- jumlah base_unit per 1 unit ini
  is_base_unit      boolean not null default false,
  unique (product_id, unit_name)
);

-- Stok saat ini (selalu dalam base_unit) — sumber kebenaran tunggal,
-- diupdate lewat trigger dari stock_movements, bukan diedit langsung.
create table product_stock (
  product_id    uuid primary key references products(id) on delete cascade,
  qty_on_hand   numeric(14,4) not null default 0,
  updated_at    timestamptz not null default now()
);

-- Kartu stok / histori pergerakan stok
create table stock_movements (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id),
  movement_type   text not null check (movement_type in ('in','out','adjustment')),
  qty_base        numeric(14,4) not null,      -- selalu dalam base_unit, bisa negatif untuk 'out'
  reference_type  text,                        -- 'sale','opname','manual_input'
  reference_id    uuid,                        -- id ke sales / stock_opname
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);
create index idx_stock_movements_product on stock_movements(product_id, created_at desc);

-- ------------------------------------------------------------
-- 5. STOK OPNAME
-- ------------------------------------------------------------
create table stock_opname (
  id            uuid primary key default gen_random_uuid(),
  opname_date   date not null default current_date,
  status        text not null default 'draft' check (status in ('draft','selesai')),
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table stock_opname_items (
  id              uuid primary key default gen_random_uuid(),
  opname_id       uuid not null references stock_opname(id) on delete cascade,
  product_id      uuid not null references products(id),
  system_qty      numeric(14,4) not null,    -- qty di sistem saat opname dibuat
  actual_qty      numeric(14,4) not null,    -- qty hasil hitung fisik
  difference      numeric(14,4) generated always as (actual_qty - system_qty) stored,
  notes           text
);

-- ------------------------------------------------------------
-- 6. PENJUALAN (sales header + item)
-- ------------------------------------------------------------
create table sales (
  id                  uuid primary key default gen_random_uuid(),
  sale_number         text not null unique,        -- generate via fungsi, format SO/2026/08/0001
  customer_id         uuid not null references customers(id),
  sale_date           date not null default current_date,

  subtotal            numeric(14,2) not null default 0,
  discount_amount     numeric(14,2) not null default 0,
  tax_enabled         boolean not null default false,   -- pajak opsional per transaksi
  tax_percent         numeric(5,2) not null default 0,
  tax_amount          numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,

  payment_term_days   integer not null default 0,       -- termin pembayaran (hari)
  due_date            date,                              -- sale_date + payment_term_days

  status              text not null default 'terproses'
                        check (status in ('draft','terproses','selesai')),

  payment_status      text not null default 'belum_bayar'
                        check (payment_status in ('belum_bayar','terbayar')),
  payment_date         date,
  payment_method        text,                            -- 'transfer','cash', dll (manual)

  shipping_status     text not null default 'belum_kirim'
                        check (shipping_status in ('belum_kirim','terkirim')),
  shipping_date        date,
  shipping_courier     text,

  is_locked           boolean not null default false,    -- true saat status = 'selesai' -> tidak bisa diedit
  created_by           uuid references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_sales_customer on sales(customer_id);
create index idx_sales_due_date on sales(due_date) where payment_status = 'belum_bayar';
create index idx_sales_status on sales(status, sale_date desc);

create table sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references sales(id) on delete cascade,
  product_id    uuid not null references products(id),
  unit_name     text not null,           -- satuan yang dipakai saat transaksi (pcs/dus/karton)
  qty           numeric(14,4) not null,
  unit_price    numeric(14,2) not null,  -- otomatis dari master, tapi bisa dioverride manual
  is_manual_price boolean not null default false,
  discount_amount numeric(14,2) not null default 0,
  subtotal      numeric(14,2) not null
);

-- ------------------------------------------------------------
-- 7. INVOICE & SURAT JALAN
-- ------------------------------------------------------------
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references sales(id),
  invoice_number  text not null unique,
  issued_date     date not null default current_date,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create table surat_jalan (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references sales(id),
  sj_number       text not null unique,
  issued_date     date not null default current_date,
  courier         text,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. KAS (kas masuk / keluar)
-- ------------------------------------------------------------
create table cash_transactions (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in ('masuk','keluar')),
  category          text,                       -- misal 'pembayaran customer','operasional','gaji'
  amount            numeric(14,2) not null,
  description       text,
  transaction_date  date not null default current_date,
  related_sale_id   uuid references sales(id),  -- nullable, terisi jika kas masuk dari pelunasan
  created_by        uuid references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_cash_date on cash_transactions(transaction_date desc);

-- ------------------------------------------------------------
-- 9. LOG AKTIVITAS
-- ------------------------------------------------------------
create table activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id),
  action        text not null,          -- 'create','update','delete','login', dll
  module        text not null,          -- nama modul terkait
  description   text not null,          -- ringkasan human-readable, misal "Mengubah harga produk Oli Mesin 1L"
  target_table  text,
  target_id     uuid,
  created_at    timestamptz not null default now()
);
create index idx_activity_logs_created on activity_logs(created_at desc);

-- ------------------------------------------------------------
-- 10. PENGATURAN UMUM (company info, format nomor, default pajak, dst)
-- ------------------------------------------------------------
create table settings (
  key           text primary key,
  value         jsonb not null,
  updated_at    timestamptz not null default now()
);
-- contoh isi awal:
-- ('company_info', '{"name":"Vijimoto","logo_url":"...","address":"..."}')
-- ('invoice_numbering', '{"prefix":"INV","format":"{prefix}/{yyyy}/{mm}/{seq}"}')
-- ('default_tax_percent', '{"value": 11}')

-- ------------------------------------------------------------
-- 11. SEED DATA AWAL (role & modul dasar)
-- ------------------------------------------------------------
insert into modules (key, label) values
  ('dashboard','Dashboard'),
  ('penjualan','Penjualan'),
  ('customer','Customer'),
  ('stok','Stok Produk'),
  ('kas','Kas'),
  ('pengaturan','Pengaturan');

insert into roles (name, label, is_system) values
  ('super_admin','Super Admin', true),
  ('admin','Admin', false),
  ('kasir','Kasir', false),
  ('finance','Finance', false),
  ('sales','Sales', false),
  ('gudang','Gudang', false);

-- ============================================================
-- CATATAN LANJUTAN (dikerjakan di file terpisah setelah skema
-- ini dikonfirmasi):
-- 1. Trigger: update product_stock otomatis setiap insert ke
--    stock_movements; update payment_track customers otomatis
--    setelah sales.payment_date terisi; update sales.due_date
--    otomatis dari sale_date + payment_term_days.
-- 2. Fungsi generate nomor urut (sale_number, invoice_number,
--    sj_number) berbasis settings.invoice_numbering.
-- 3. RLS policy per role memakai role_permissions di atas.
-- 4. Tabel offline sync queue (untuk PWA offline-first) —
--    disiapkan di sisi client (IndexedDB) + endpoint sync,
--    bukan di skema Postgres ini.
-- ============================================================
