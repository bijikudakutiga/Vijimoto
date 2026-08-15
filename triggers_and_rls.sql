-- ============================================================
-- VIJIMOTO SUPER POS — TRIGGER, FUNGSI OTOMATISASI, & RLS
-- Dijalankan SETELAH schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- 0. HELPER: cek role & permission user yang sedang login
-- ------------------------------------------------------------
create or replace function is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p
    join roles r on r.id = p.role_id
    where p.id = auth.uid() and r.name = 'super_admin' and p.is_active
  );
$$;

create or replace function has_permission(p_module text, p_action text)
returns boolean language sql stable as $$
  select
    is_super_admin() or exists (
      select 1
      from profiles p
      join roles r on r.id = p.role_id
      join role_permissions rp on rp.role_id = r.id
      join modules m on m.id = rp.module_id
      where p.id = auth.uid()
        and p.is_active
        and m.key = p_module
        and (
          (p_action = 'view'    and rp.can_view)    or
          (p_action = 'create'  and rp.can_create)  or
          (p_action = 'edit'    and rp.can_edit)     or
          (p_action = 'delete'  and rp.can_delete)   or
          (p_action = 'approve' and rp.can_approve)
        )
    );
$$;

-- ------------------------------------------------------------
-- 1. NOMOR DOKUMEN OTOMATIS (sale_number, invoice_number, sj_number)
-- ------------------------------------------------------------
create table doc_counters (
  doc_type    text not null,      -- 'sale','invoice','sj'
  period      text not null,      -- format 'yyyymm', misal '202608'
  last_seq    integer not null default 0,
  primary key (doc_type, period)
);

create or replace function generate_doc_number(p_doc_type text, p_prefix text)
returns text language plpgsql as $$
declare
  v_period text := to_char(current_date, 'yyyymm');
  v_seq    integer;
begin
  insert into doc_counters (doc_type, period, last_seq)
  values (p_doc_type, v_period, 1)
  on conflict (doc_type, period)
    do update set last_seq = doc_counters.last_seq + 1
  returning last_seq into v_seq;

  return format('%s/%s/%s/%s',
    p_prefix,
    to_char(current_date, 'yyyy'),
    to_char(current_date, 'mm'),
    lpad(v_seq::text, 4, '0')
  );
end;
$$;

-- Auto-isi sale_number saat insert baru
create or replace function fn_sales_before_insert()
returns trigger language plpgsql as $$
begin
  if new.sale_number is null or new.sale_number = '' then
    new.sale_number := generate_doc_number('sale', 'SO');
  end if;
  if new.due_date is null then
    new.due_date := new.sale_date + (new.payment_term_days || ' days')::interval;
  end if;
  return new;
end;
$$;
create trigger trg_sales_before_insert
  before insert on sales
  for each row execute function fn_sales_before_insert();

-- Auto-isi invoice_number / sj_number saat insert baru
create or replace function fn_invoices_before_insert()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := generate_doc_number('invoice', 'INV');
  end if;
  return new;
end;
$$;
create trigger trg_invoices_before_insert
  before insert on invoices
  for each row execute function fn_invoices_before_insert();

create or replace function fn_sj_before_insert()
returns trigger language plpgsql as $$
begin
  if new.sj_number is null or new.sj_number = '' then
    new.sj_number := generate_doc_number('sj', 'SJ');
  end if;
  return new;
end;
$$;
create trigger trg_sj_before_insert
  before insert on surat_jalan
  for each row execute function fn_sj_before_insert();

-- ------------------------------------------------------------
-- 2. KUNCI TRANSAKSI SETELAH SELESAI (tidak bisa diedit lagi)
-- ------------------------------------------------------------
create or replace function fn_sales_guard_locked()
returns trigger language plpgsql as $$
begin
  if old.is_locked and not is_super_admin() then
    raise exception 'Transaksi % sudah selesai dan terkunci, tidak bisa diedit.', old.sale_number;
  end if;
  return new;
end;
$$;
create trigger trg_sales_guard_locked
  before update on sales
  for each row execute function fn_sales_guard_locked();

-- Status otomatis jadi 'selesai' + terkunci saat kedua status terisi
create or replace function fn_sales_auto_complete()
returns trigger language plpgsql as $$
begin
  if new.payment_status = 'terbayar' and new.shipping_status = 'terkirim' then
    new.status := 'selesai';
    new.is_locked := true;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_sales_auto_complete
  before update on sales
  for each row execute function fn_sales_auto_complete();

-- ------------------------------------------------------------
-- 3. STOK: update product_stock otomatis dari stock_movements
-- ------------------------------------------------------------
create or replace function fn_apply_stock_movement()
returns trigger language plpgsql as $$
begin
  insert into product_stock (product_id, qty_on_hand, updated_at)
  values (new.product_id, new.qty_base, now())
  on conflict (product_id)
    do update set
      qty_on_hand = product_stock.qty_on_hand + new.qty_base,
      updated_at = now();
  return new;
end;
$$;
create trigger trg_apply_stock_movement
  after insert on stock_movements
  for each row execute function fn_apply_stock_movement();

-- Saat sale_items ditambahkan ke transaksi yang sudah 'terproses',
-- otomatis buat stock_movements 'out' (qty dikonversi ke base_unit)
create or replace function fn_sale_item_deduct_stock()
returns trigger language plpgsql as $$
declare
  v_conversion numeric(14,4);
  v_qty_base   numeric(14,4);
begin
  select conversion_to_base into v_conversion
  from product_units
  where product_id = new.product_id and unit_name = new.unit_name;

  if v_conversion is null then v_conversion := 1; end if;
  v_qty_base := new.qty * v_conversion;

  insert into stock_movements (product_id, movement_type, qty_base, reference_type, reference_id, notes, created_by)
  values (new.product_id, 'out', -v_qty_base, 'sale', new.sale_id, 'Penjualan otomatis', auth.uid());

  return new;
end;
$$;
create trigger trg_sale_item_deduct_stock
  after insert on sale_items
  for each row execute function fn_sale_item_deduct_stock();

-- Stok opname 'selesai' -> buat movement 'adjustment' sesuai selisih
create or replace function fn_stock_opname_apply()
returns trigger language plpgsql as $$
declare
  r record;
begin
  if new.status = 'selesai' and old.status = 'draft' then
    for r in select * from stock_opname_items where opname_id = new.id and difference <> 0 loop
      insert into stock_movements (product_id, movement_type, qty_base, reference_type, reference_id, notes, created_by)
      values (r.product_id, 'adjustment', r.difference, 'opname', new.id, 'Penyesuaian stok opname', auth.uid());
    end loop;
  end if;
  return new;
end;
$$;
create trigger trg_stock_opname_apply
  before update on stock_opname
  for each row execute function fn_stock_opname_apply();

-- ------------------------------------------------------------
-- 4. RIWAYAT PEMBAYARAN CUSTOMER (baik/waspada/buruk) otomatis
-- ------------------------------------------------------------
create or replace function fn_recalc_customer_payment_track(p_customer_id uuid)
returns void language plpgsql as $$
declare
  v_max_late_days integer;
begin
  select coalesce(max(payment_date - due_date), 0) into v_max_late_days
  from sales
  where customer_id = p_customer_id and payment_status = 'terbayar';

  update customers
  set payment_track = case
        when v_max_late_days > 60 then 'buruk'
        when v_max_late_days > 0  then 'waspada'
        else 'baik'
      end,
      updated_at = now()
  where id = p_customer_id;
end;
$$;

create or replace function fn_sales_after_payment_update()
returns trigger language plpgsql as $$
begin
  if new.payment_status = 'terbayar' and (old.payment_status is distinct from new.payment_status or old.payment_date is distinct from new.payment_date) then
    perform fn_recalc_customer_payment_track(new.customer_id);
  end if;
  return new;
end;
$$;
create trigger trg_sales_after_payment_update
  after update on sales
  for each row execute function fn_sales_after_payment_update();

-- ------------------------------------------------------------
-- 5. LOG AKTIVITAS OTOMATIS (contoh untuk tabel sensitif)
-- ------------------------------------------------------------
create or replace function fn_log_activity()
returns trigger language plpgsql as $$
declare
  v_desc text;
begin
  v_desc := format('%s pada %s (id: %s)', tg_op, tg_table_name, coalesce(new.id, old.id));
  insert into activity_logs (user_id, action, module, description, target_table, target_id)
  values (auth.uid(), lower(tg_op), tg_table_name, v_desc, tg_table_name, coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;
create trigger trg_log_sales     after insert or update or delete on sales     for each row execute function fn_log_activity();
create trigger trg_log_customers after insert or update or delete on customers for each row execute function fn_log_activity();
create trigger trg_log_products  after insert or update or delete on products  for each row execute function fn_log_activity();
create trigger trg_log_cash      after insert or update or delete on cash_transactions for each row execute function fn_log_activity();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table roles enable row level security;
alter table modules enable row level security;
alter table role_permissions enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table product_units enable row level security;
alter table product_stock enable row level security;
alter table stock_movements enable row level security;
alter table stock_opname enable row level security;
alter table stock_opname_items enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table invoices enable row level security;
alter table surat_jalan enable row level security;
alter table cash_transactions enable row level security;
alter table activity_logs enable row level security;
alter table settings enable row level security;
alter table doc_counters enable row level security;

-- Profil: user lihat profil sendiri; super admin lihat/kelola semua
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_super_admin());
create policy profiles_update on profiles for update
  using (id = auth.uid() or is_super_admin());
create policy profiles_insert on profiles for insert
  with check (is_super_admin());
create policy profiles_delete on profiles for delete
  using (is_super_admin());

-- Roles & permissions: hanya super admin yang bisa kelola,
-- semua user login boleh baca (untuk keperluan UI)
create policy roles_select on roles for select using (auth.uid() is not null);
create policy roles_manage on roles for all using (is_super_admin()) with check (is_super_admin());

create policy modules_select on modules for select using (auth.uid() is not null);

create policy role_permissions_select on role_permissions for select using (auth.uid() is not null);
create policy role_permissions_manage on role_permissions for all using (is_super_admin()) with check (is_super_admin());

-- Pola policy standar untuk modul transaksional: pakai has_permission()
create policy customers_select on customers for select using (has_permission('customer','view'));
create policy customers_insert on customers for insert with check (has_permission('customer','create'));
create policy customers_update on customers for update using (has_permission('customer','edit'));
create policy customers_delete on customers for delete using (has_permission('customer','delete'));

create policy products_select on products for select using (has_permission('stok','view'));
create policy products_insert on products for insert with check (has_permission('stok','create'));
create policy products_update on products for update using (has_permission('stok','edit'));
create policy products_delete on products for delete using (has_permission('stok','delete'));

create policy product_units_all on product_units for all
  using (has_permission('stok','view')) with check (has_permission('stok','edit'));
create policy product_stock_select on product_stock for select using (has_permission('stok','view'));
create policy stock_movements_select on stock_movements for select using (has_permission('stok','view'));
create policy stock_movements_insert on stock_movements for insert with check (has_permission('stok','edit'));

create policy stock_opname_all on stock_opname for all
  using (has_permission('stok','view')) with check (has_permission('stok','create'));
create policy stock_opname_items_all on stock_opname_items for all
  using (has_permission('stok','view')) with check (has_permission('stok','edit'));

create policy sales_select on sales for select using (has_permission('penjualan','view'));
create policy sales_insert on sales for insert with check (has_permission('penjualan','create'));
create policy sales_update on sales for update using (has_permission('penjualan','edit'));
create policy sales_delete on sales for delete using (has_permission('penjualan','delete'));

create policy sale_items_select on sale_items for select using (has_permission('penjualan','view'));
create policy sale_items_insert on sale_items for insert with check (has_permission('penjualan','create'));
create policy sale_items_update on sale_items for update using (has_permission('penjualan','edit'));
create policy sale_items_delete on sale_items for delete using (has_permission('penjualan','edit'));

create policy invoices_all on invoices for all
  using (has_permission('penjualan','view')) with check (has_permission('penjualan','create'));
create policy sj_all on surat_jalan for all
  using (has_permission('penjualan','view')) with check (has_permission('penjualan','create'));

create policy cash_select on cash_transactions for select using (has_permission('kas','view'));
create policy cash_insert on cash_transactions for insert with check (has_permission('kas','create'));
create policy cash_update on cash_transactions for update using (has_permission('kas','edit'));
create policy cash_delete on cash_transactions for delete using (has_permission('kas','delete'));

-- Log aktivitas: semua user login boleh lihat (transparansi internal);
-- hanya sistem (trigger, security definer) yang boleh insert
create policy activity_logs_select on activity_logs for select using (auth.uid() is not null);

create policy settings_select on settings for select using (auth.uid() is not null);
create policy settings_manage on settings for all using (is_super_admin()) with check (is_super_admin());

create policy doc_counters_select on doc_counters for select using (auth.uid() is not null);

-- ============================================================
-- CATATAN:
-- * Fungsi has_permission() otomatis meloloskan super_admin,
--   jadi tidak perlu ditulis ulang di setiap policy.
-- * Modul "pengaturan" (profil, log, manajemen akses) diatur
--   lewat policy profiles/roles/role_permissions di atas —
--   tidak perlu tabel modul terpisah.
-- * Trigger fn_log_activity pakai auth.uid() miliknya sendiri,
--   jadi tetap tercatat walau user tidak insert langsung ke
--   activity_logs (RLS activity_logs tidak mengizinkan insert
--   manual dari client, hanya lewat trigger security definer —
--   perlu ditambahkan `security definer` pada fungsi ini saat
--   deploy produksi).
-- ============================================================
