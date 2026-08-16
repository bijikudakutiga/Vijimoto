"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ExtraUnit = { key: number; unit_name: string; conversion_to_base: number };
let keyCounter = 0;

export function ProductInputForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [baseUnit, setBaseUnit] = useState("pcs");
  const [priceSell, setPriceSell] = useState(0);
  const [priceBuy, setPriceBuy] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [initialStock, setInitialStock] = useState(0);
  const [extraUnits, setExtraUnits] = useState<ExtraUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addExtraUnit() {
    setExtraUnits((prev) => [
      ...prev,
      { key: keyCounter++, unit_name: "", conversion_to_base: 1 },
    ]);
  }
  function removeExtraUnit(key: number) {
    setExtraUnits((prev) => prev.filter((u) => u.key !== key));
  }
  function updateExtraUnit(key: number, patch: Partial<ExtraUnit>) {
    setExtraUnits((prev) =>
      prev.map((u) => (u.key === key ? { ...u, ...patch } : u))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !baseUnit) {
      setError("Nama produk dan satuan dasar wajib diisi.");
      return;
    }

    setSaving(true);

    const { data: product, error: prodError } = await supabase
      .from("products")
      .insert({
        name,
        sku: sku || null,
        base_unit: baseUnit,
        price_sell: priceSell,
        price_buy: priceBuy,
        min_stock: minStock,
      })
      .select("id")
      .single();

    if (prodError || !product) {
      setError("Gagal menyimpan produk: " + prodError?.message);
      setSaving(false);
      return;
    }

    const unitsToInsert = [
      { product_id: product.id, unit_name: baseUnit, conversion_to_base: 1, is_base_unit: true },
      ...extraUnits
        .filter((u) => u.unit_name)
        .map((u) => ({
          product_id: product.id,
          unit_name: u.unit_name,
          conversion_to_base: u.conversion_to_base,
          is_base_unit: false,
        })),
    ];
    const { error: unitError } = await supabase.from("product_units").insert(unitsToInsert);
    if (unitError) {
      setError("Produk tersimpan tapi satuan gagal: " + unitError.message);
      setSaving(false);
      return;
    }

    if (initialStock > 0) {
      await supabase.from("stock_movements").insert({
        product_id: product.id,
        movement_type: "in",
        qty_base: initialStock,
        reference_type: "manual_input",
        notes: "Stok awal saat produk dibuat",
      });
    }

    router.push("/stok/data");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Nama Produk
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="Oli Mesin 1L"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            SKU (opsional)
          </label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Satuan Dasar
          </label>
          <input
            value={baseUnit}
            onChange={(e) => setBaseUnit(e.target.value)}
            placeholder="pcs"
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Harga Jual / {baseUnit || "satuan"}
          </label>
          <input
            type="number" onFocus={(e) => e.target.select()} min={0} value={priceSell}
            onChange={(e) => setPriceSell(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Harga Beli (opsional)
          </label>
          <input
            type="number" onFocus={(e) => e.target.select()} min={0} value={priceBuy}
            onChange={(e) => setPriceBuy(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="font-display text-[15px] font-semibold">
          Satuan Konversi Tambahan
        </div>
        <button
          type="button"
          onClick={addExtraUnit}
          className="text-xs font-semibold bg-orange-soft text-orange-deep rounded-pill px-3.5 py-1.5"
        >
          + Tambah Satuan
        </button>
      </div>
      <p className="text-xs text-ink-soft -mt-2">
        Contoh: 1 dus = 12 {baseUnit || "pcs"} → isi nama &quot;dus&quot;, konversi 12
      </p>

      <div className="space-y-2">
        {extraUnits.map((u) => (
          <div key={u.key} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-ink-soft uppercase">
                Nama Satuan
              </label>
              <input
                value={u.unit_name}
                onChange={(e) => updateExtraUnit(u.key, { unit_name: e.target.value })}
                placeholder="dus"
                className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-ink-soft uppercase">
                1 {u.unit_name || "satuan"} = berapa {baseUnit || "pcs"}?
              </label>
              <input
                type="number" onFocus={(e) => e.target.select()} min={1} value={u.conversion_to_base}
                onChange={(e) =>
                  updateExtraUnit(u.key, { conversion_to_base: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeExtraUnit(u.key)}
              className="text-status-red-tx text-xs font-semibold pb-2"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line">
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Ambang Batas Stok Minimum
          </label>
          <input
            type="number" onFocus={(e) => e.target.select()} min={0} value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Stok Awal ({baseUnit || "pcs"})
          </label>
          <input
            type="number" onFocus={(e) => e.target.select()} min={0} value={initialStock}
            onChange={(e) => setInitialStock(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-orange text-white text-sm font-semibold rounded-pill px-5 py-2.5 disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : "Simpan Produk"}
      </button>
    </form>
  );
}
