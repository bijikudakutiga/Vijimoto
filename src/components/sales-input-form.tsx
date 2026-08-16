"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePdf, generateSuratJalanPdf } from "@/lib/pdf/documents";

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

type SaleItem = {
  key: number;
  product_id: string;
  product_name: string;
  unit_name: string;
  qty: number;
  unit_price: number;
  is_manual_price: boolean;
  discount_amount: number;
  availableUnits: ProductUnit[];
};

function formatRupiah(v: number) {
  if (!Number.isFinite(v)) return "Rp 0";
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}

let keyCounter = 0;

export function SalesInputForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentTermDays, setPaymentTermDays] = useState(0);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPercent, setTaxPercent] = useState(11);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSale, setCreatedSale] = useState<{ id: string; sale_number: string } | null>(null);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: keyCounter++,
        product_id: "",
        product_name: "",
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

  function updateItem(key: number, patch: Partial<SaleItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it))
    );
  }

  function handleSelectProduct(key: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const units: ProductUnit[] =
      product.product_units?.length > 0
        ? product.product_units
        : [{ unit_name: product.base_unit, conversion_to_base: 1, is_base_unit: true }];

    const baseUnit = units.find((u) => u.is_base_unit) ?? units[0];

    updateItem(key, {
      product_id: product.id,
      product_name: product.name,
      unit_name: baseUnit.unit_name,
      unit_price: product.price_sell * baseUnit.conversion_to_base,
      is_manual_price: false,
      availableUnits: units,
    });
  }

  function handleSelectUnit(key: number, item: SaleItem, unitName: string) {
    const product = products.find((p) => p.id === item.product_id);
    const unit = item.availableUnits.find((u) => u.unit_name === unitName);
    if (!product || !unit) return;
    updateItem(key, {
      unit_name: unitName,
      unit_price: item.is_manual_price
        ? item.unit_price
        : product.price_sell * unit.conversion_to_base,
    });
  }

  const itemsSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + it.qty * it.unit_price - it.discount_amount,
        0
      ),
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

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        customer_id: customerId,
        sale_date: saleDate,
        subtotal: itemsSubtotal,
        discount_amount: overallDiscount,
        tax_enabled: taxEnabled,
        tax_percent: taxEnabled ? taxPercent : 0,
        tax_amount: taxAmount,
        total: total,
        payment_term_days: paymentTermDays,
      })
      .select("id, sale_number")
      .single();

    if (saleError || !sale) {
      setError("Gagal menyimpan transaksi: " + saleError?.message);
      setSaving(false);
      return;
    }

    const { error: itemsError } = await supabase.from("sale_items").insert(
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

    if (itemsError) {
      setError("Transaksi tersimpan tapi item produk gagal: " + itemsError.message);
      setSaving(false);
      return;
    }

    setCreatedSale(sale);
    setSaving(false);
  }

  const [docLoading, setDocLoading] = useState<"invoice" | "sj" | null>(null);

  async function handleCreateInvoice() {
    if (!createdSale) return;
    setDocLoading("invoice");
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({ sale_id: createdSale.id })
      .select("invoice_number")
      .single();

    if (!error && inv) {
      const { data: customer } = await supabase
        .from("customers")
        .select("name, address, phone")
        .eq("id", customerId)
        .single();

      const dueDate = new Date(saleDate);
      dueDate.setDate(dueDate.getDate() + paymentTermDays);

      await generateInvoicePdf({
        invoiceNumber: inv.invoice_number,
        sale: {
          sale_number: createdSale.sale_number,
          sale_date: saleDate,
          due_date: dueDate.toISOString().slice(0, 10),
          subtotal: itemsSubtotal,
          discount_amount: overallDiscount,
          tax_enabled: taxEnabled,
          tax_percent: taxPercent,
          tax_amount: taxAmount,
          total: total,
        },
        customer: customer ?? { name: "-", address: "-", phone: "-" },
        items: items.map((it) => ({
          product_name: it.product_name,
          unit_name: it.unit_name,
          qty: it.qty,
          unit_price: it.unit_price,
          discount_amount: it.discount_amount,
          subtotal: it.qty * it.unit_price - it.discount_amount,
        })),
      });
    }
    setDocLoading(null);
    router.push("/penjualan/status");
  }

  async function handleCreateSuratJalan() {
    if (!createdSale) return;
    setDocLoading("sj");
    const { data: sj, error } = await supabase
      .from("surat_jalan")
      .insert({ sale_id: createdSale.id })
      .select("sj_number")
      .single();

    if (!error && sj) {
      const { data: customer } = await supabase
        .from("customers")
        .select("name, address, phone")
        .eq("id", customerId)
        .single();

      await generateSuratJalanPdf({
        sjNumber: sj.sj_number,
        sale: { sale_number: createdSale.sale_number, sale_date: saleDate },
        customer: customer ?? { name: "-", address: "-", phone: "-" },
        items: items.map((it) => ({
          product_name: it.product_name,
          unit_name: it.unit_name,
          qty: it.qty,
          unit_price: it.unit_price,
          discount_amount: it.discount_amount,
          subtotal: it.qty * it.unit_price - it.discount_amount,
        })),
      });
    }
    setDocLoading(null);
    router.push("/penjualan/status");
  }

  if (createdSale) {
    return (
      <div className="card max-w-lg">
        <div className="badge-green inline-block text-xs font-bold px-3 py-1 rounded-pill mb-3">
          Transaksi Tersimpan
        </div>
        <div className="font-display text-xl font-semibold mb-1">
          {createdSale.sale_number}
        </div>
        <p className="text-sm text-ink-soft mb-5">
          Status: <b>terproses</b>. Lanjutkan dengan membuat invoice dan/atau
          surat jalan, atau kelola statusnya nanti di menu Status Transaksi.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCreateInvoice}
            disabled={docLoading !== null}
            className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
          >
            {docLoading === "invoice" ? "Membuat PDF..." : "Buat Invoice"}
          </button>
          <button
            onClick={handleCreateSuratJalan}
            disabled={docLoading !== null}
            className="bg-teal text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
          >
            {docLoading === "sj" ? "Membuat PDF..." : "Buat Surat Jalan"}
          </button>
          <button
            onClick={() => {
              setCreatedSale(null);
              setItems([]);
              setCustomerId("");
              setOverallDiscount(0);
            }}
            className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2 border border-line"
          >
            Input Transaksi Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-white"
            >
              <option value="">Pilih customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.pic_name ? ` (${c.pic_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Tanggal Penjualan
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-[15px] font-semibold">
            Daftar Produk
          </div>
          <button
            onClick={addItem}
            className="text-xs font-semibold bg-orange-soft text-orange-deep rounded-pill px-3.5 py-1.5"
          >
            + Tambah Produk
          </button>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-ink-soft py-4 text-center border border-dashed border-line rounded-xl">
              Belum ada produk. Klik &quot;Tambah Produk&quot; untuk mulai.
            </p>
          )}
          {items.map((it) => (
            <div
              key={it.key}
              className="border border-line rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-[1.6fr_0.8fr_0.6fr_1fr_1fr_auto] gap-2 items-end"
            >
              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">
                  Produk
                </label>
                <select
                  value={it.product_id}
                  onChange={(e) => handleSelectProduct(it.key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                >
                  <option value="">Pilih...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">
                  Satuan
                </label>
                <select
                  value={it.unit_name}
                  onChange={(e) => handleSelectUnit(it.key, it, e.target.value)}
                  disabled={!it.product_id}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                >
                  {it.availableUnits.map((u) => (
                    <option key={u.unit_name} value={u.unit_name}>
                      {u.unit_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">
                  Qty
                </label>
                <input
                  type="number" onFocus={(e) => e.target.select()}
                  min={0}
                  value={it.qty}
                  onChange={(e) =>
                    updateItem(it.key, { qty: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase flex items-center gap-1">
                  Harga
                  <input
                    type="checkbox"
                    checked={it.is_manual_price}
                    onChange={(e) =>
                      updateItem(it.key, { is_manual_price: e.target.checked })
                    }
                    title="Isi harga manual"
                  />
                </label>
                <input
                  type="number" onFocus={(e) => e.target.select()}
                  min={0}
                  value={it.unit_price}
                  disabled={!it.is_manual_price}
                  onChange={(e) =>
                    updateItem(it.key, { unit_price: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs disabled:bg-orange-softer"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-ink-soft uppercase">
                  Diskon (Rp)
                </label>
                <input
                  type="number" onFocus={(e) => e.target.select()}
                  min={0}
                  value={it.discount_amount}
                  onChange={(e) =>
                    updateItem(it.key, {
                      discount_amount: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                />
              </div>

              <button
                onClick={() => removeItem(it.key)}
                className="text-status-red-tx text-xs font-semibold pb-2"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card lg:sticky lg:top-6">
        <div className="font-display text-[15px] font-semibold mb-4">
          Ringkasan
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Termin Pembayaran (hari)
            </label>
            <input
              type="number" onFocus={(e) => e.target.select()}
              min={0}
              value={paymentTermDays}
              onChange={(e) => setPaymentTermDays(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Diskon Total (Rp)
            </label>
            <input
              type="number" onFocus={(e) => e.target.select()}
              min={0}
              value={overallDiscount}
              onChange={(e) => setOverallDiscount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-between border border-line rounded-xl px-3 py-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
              />
              Pajak (PPN)
            </label>
            <input
              type="number" onFocus={(e) => e.target.select()}
              min={0}
              max={100}
              disabled={!taxEnabled}
              value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value))}
              className="w-16 rounded-lg border border-line px-2 py-1 text-sm text-right disabled:bg-orange-softer"
            />
          </div>
        </div>

        <div className="border-t border-line pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="font-mono">{formatRupiah(itemsSubtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Diskon Total</span>
            <span className="font-mono">- {formatRupiah(overallDiscount)}</span>
          </div>
          {taxEnabled && (
            <div className="flex justify-between text-ink-soft">
              <span>Pajak ({taxPercent}%)</span>
              <span className="font-mono">{formatRupiah(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-display text-lg font-semibold pt-2 border-t border-line mt-2">
            <span>Total</span>
            <span className="text-orange-deep">{formatRupiah(total)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-orange hover:bg-orange-deep transition-colors text-white
                     font-semibold text-sm rounded-pill py-2.5 mt-4 disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Transaksi"}
        </button>
      </div>
    </div>
  );
}
