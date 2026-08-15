"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProductUnit = {
  unit_name: string;
  conversion_to_base: number;
  is_base_unit: boolean;
};
type Product = {
  id: string;
  name: string;
  sku: string | null;
  price_sell: number;
  base_unit: string;
  product_units: ProductUnit[];
};
type Customer = { id: string; name: string; pic_name: string | null };
type InitialItem = {
  id: string;
  product_id: string;
  unit_name: string;
  qty: number;
  unit_price: number;
  is_manual_price: boolean;
  discount_amount: number;
};
type SaleHeader = {
  id: string;
  sale_number: string;
  customer_id: string;
  sale_date: string;
  discount_amount: number;
  tax_enabled: boolean;
  tax_percent: number;
  payment_term_days: number;
};

type EditItem = InitialItem & { key: number; availableUnits: ProductUnit[] };

function formatRupiah(v: number) {
  if (!Number.isFinite(v)) return "Rp 0";
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}

let keyCounter = 100000;

function unitsFor(product: Product | undefined): ProductUnit[] {
  if (!product) return [];
  return product.product_units?.length > 0
    ? product.product_units
    : [{ unit_name: product.base_unit, conversion_to_base: 1, is_base_unit: true }];
}

export function SalesEditForm({
  sale,
  initialItems,
  customers,
  products,
}: {
  sale: SaleHeader;
  initialItems: InitialItem[];
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [customerId, setCustomerId] = useState(sale.customer_id);
  const [saleDate, setSaleDate] = useState(sale.sale_date);
  const [paymentTermDays, setPaymentTermDays] = useState(sale.payment_term_days);
  const [overallDiscount, setOverallDiscount] = useState(sale.discount_amount);
  const [taxEnabled, setTaxEnabled] = useState(sale.tax_enabled);
  const [taxPercent, setTaxPercent] = useState(sale.tax_percent || 11);
  const [items, setItems] = useState<EditItem[]>(() =>
    initialItems.map((it) => ({
      ...it,
      key: keyCounter++,
      availableUnits: unitsFor(products.find((p) => p.id === it.product_id)),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: keyCounter++,
        id: "",
        product_id: "",
        unit_name: "",
        qty: 1,
        unit_price: 0,
        is_manual_price: false,
        discount_amount: 0,
        availableUnits: [],
      },
    ]);
  }
  function removeItem(key: number) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function updateItem(key: number, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function handleSelectProduct(key: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const units = unitsFor(product);
    const baseUnit = units.find((u) => u.is_base_unit) ?? units[0];
    updateItem(key, {
      product_id: product.id,
      unit_name: baseUnit.unit_name,
      unit_price: product.price_sell * baseUnit.conversion_to_base,
      is_manual_price: false,
      availableUnits: units,
    });
  }
  function handleSelectUnit(key: number, item: EditItem, unitName: string) {
    const product = products.find((p) => p.id === item.product_id);
    const unit = item.availableUnits.find((u) => u.unit_name === unitName);
    if (!product || !unit) return;
    updateItem(key, {
      unit_name: unitName,
      unit_price: item.is_manual_price ? item.unit_price : product.price_sell * unit.conversion_to_base,
    });
  }

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.qty * it.unit_price - it.discount_amount, 0),
    [items]
  );
  const afterOverallDiscount = Math.max(itemsSubtotal - overallDiscount, 0);
  const taxAmount = taxEnabled ? (afterOverallDiscount * taxPercent) / 100 : 0;
  const total = afterOverallDiscount + taxAmount;

  async function handleSubmit() {
    setError(null);
    if (!customerId) return setError("Pilih customer terlebih dahulu.");
    if (items.length === 0) return setError("Tambahkan minimal satu produk.");
    if (items.some((it) => !it.product_id))
      return setError("Ada baris produk yang belum dipilih.");

    setSaving(true);

    // 1. Kembalikan stok dari item lama (reverse deduction) sebelum dihapus
    for (const old of initialItems) {
      const product = products.find((p) => p.id === old.product_id);
      const unit = unitsFor(product).find((u) => u.unit_name === old.unit_name);
      const conversion = unit?.conversion_to_base ?? 1;
      const qtyBase = old.qty * conversion;
      await supabase.from("stock_movements").insert({
        product_id: old.product_id,
        movement_type: "adjustment",
        qty_base: qtyBase,
        reference_type: "sale_edit_reverse",
        reference_id: sale.id,
        notes: `Pembatalan item lama saat edit transaksi ${sale.sale_number}`,
      });
    }

    // 2. Hapus item lama
    const { error: delError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", sale.id);
    if (delError) {
      setError("Gagal menghapus item lama: " + delError.message);
      setSaving(false);
      return;
    }

    // 3. Simpan item baru (trigger otomatis mengurangi stok sesuai qty baru)
    const { error: insError } = await supabase.from("sale_items").insert(
      items.map((it) => ({
        sale_id: sale.id,
        product_id: it.product_id,
        unit_name: it.unit_name,
        qty: it.qty,
        unit_price: it.unit_price,
        is_manual_price: it.is_manual_price,
        discount_amount: it.discount_amount,
        subtotal: it.qty * it.unit_price - it.discount_amount,
      }))
    );
    if (insError) {
      setError("Gagal menyimpan item baru: " + insError.message);
      setSaving(false);
      return;
    }

    // 4. Update header transaksi
    const dueDate = new Date(saleDate);
    dueDate.setDate(dueDate.getDate() + paymentTermDays);

    const { error: updError } = await supabase
      .from("sales")
      .update({
        customer_id: customerId,
        sale_date: saleDate,
        due_date: dueDate.toISOString().slice(0, 10),
        payment_term_days: paymentTermDays,
        subtotal: itemsSubtotal,
        discount_amount: overallDiscount,
        tax_enabled: taxEnabled,
        tax_percent: taxEnabled ? taxPercent : 0,
        tax_amount: taxAmount,
        total: total,
      })
      .eq("id", sale.id);

    setSaving(false);
    if (updError) {
      setError("Item tersimpan tapi header gagal terupdate: " + updError.message);
      return;
    }

    router.push("/penjualan/data");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
      <div className="card">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.pic_name ? ` (${c.pic_name})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Tanggal Penjualan</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-[15px] font-semibold">Daftar Produk</div>
          <button onClick={addItem} className="text-xs font-semibold bg-orange-soft text-orange-deep rounded-pill px-3.5 py-1.5">
            + Tambah Produk
          </button>
        </div>

        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.key} className="border border-line rounded-2xl p-3 grid grid-cols-[1.6fr_0.8fr_0.6fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">Produk</label>
                <select
                  value={it.product_id}
                  onChange={(e) => handleSelectProduct(it.key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                >
                  <option value="">Pilih...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">Satuan</label>
                <select
                  value={it.unit_name}
                  onChange={(e) => handleSelectUnit(it.key, it, e.target.value)}
                  disabled={!it.product_id}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                >
                  {it.availableUnits.map((u) => <option key={u.unit_name} value={u.unit_name}>{u.unit_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">Qty</label>
                <input
                  type="number" min={0} value={it.qty}
                  onChange={(e) => updateItem(it.key, { qty: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase flex items-center gap-1">
                  Harga
                  <input
                    type="checkbox" checked={it.is_manual_price}
                    onChange={(e) => updateItem(it.key, { is_manual_price: e.target.checked })}
                  />
                </label>
                <input
                  type="number" min={0} value={it.unit_price} disabled={!it.is_manual_price}
                  onChange={(e) => updateItem(it.key, { unit_price: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs disabled:bg-orange-softer"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">Diskon (Rp)</label>
                <input
                  type="number" min={0} value={it.discount_amount}
                  onChange={(e) => updateItem(it.key, { discount_amount: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                />
              </div>
              <button onClick={() => removeItem(it.key)} className="text-status-red-tx text-xs font-semibold pb-2">
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card sticky top-6">
        <div className="font-display text-[15px] font-semibold mb-4">Ringkasan</div>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Termin Pembayaran (hari)</label>
            <input
              type="number" min={0} value={paymentTermDays}
              onChange={(e) => setPaymentTermDays(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Diskon Total (Rp)</label>
            <input
              type="number" min={0} value={overallDiscount}
              onChange={(e) => setOverallDiscount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-between border border-line rounded-xl px-3 py-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
              Pajak (PPN)
            </label>
            <input
              type="number" min={0} max={100} disabled={!taxEnabled} value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value))}
              className="w-16 rounded-lg border border-line px-2 py-1 text-sm text-right disabled:bg-orange-softer"
            />
          </div>
        </div>

        <div className="border-t border-line pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span className="font-mono">{formatRupiah(itemsSubtotal)}</span></div>
          <div className="flex justify-between text-ink-soft"><span>Diskon Total</span><span className="font-mono">- {formatRupiah(overallDiscount)}</span></div>
          {taxEnabled && (
            <div className="flex justify-between text-ink-soft"><span>Pajak ({taxPercent}%)</span><span className="font-mono">{formatRupiah(taxAmount)}</span></div>
          )}
          <div className="flex justify-between font-display text-lg font-semibold pt-2 border-t border-line mt-2">
            <span>Total</span><span className="text-orange-deep">{formatRupiah(total)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2 mt-4">{error}</p>}

        <button
          onClick={handleSubmit} disabled={saving}
          className="w-full bg-orange hover:bg-orange-deep transition-colors text-white font-semibold text-sm rounded-pill py-2.5 mt-4 disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
