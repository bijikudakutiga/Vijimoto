"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CustomerInputForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [picName, setPicName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !address || !phone) {
      setError("Nama, alamat, dan no. telepon wajib diisi.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      name,
      pic_name: picName || null,
      address,
      phone,
      email: email || null,
    });
    setSaving(false);

    if (error) {
      setError("Gagal menyimpan: " + error.message);
      return;
    }

    router.push("/customer/data");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg space-y-4">
      <div>
        <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
          Nama Customer / Perusahaan
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          placeholder="CV Sumber Jaya Motor"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
          PIC (opsional)
        </label>
        <input
          value={picName}
          onChange={(e) => setPicName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
          Alamat Lengkap
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            No. Telepon
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Email (opsional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        {saving ? "Menyimpan..." : "Simpan Customer"}
      </button>
    </form>
  );
}
