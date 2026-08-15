"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({
  fullName,
  email,
  roleLabel,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(fullName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [passMsg, setPassMsg] = useState<string | null>(null);

  async function handleSaveName() {
    setSavingName(true);
    setNameMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    setSavingName(false);
    setNameMsg(error ? "Gagal menyimpan: " + error.message : "Nama berhasil diperbarui.");
    router.refresh();
  }

  async function handleChangePassword() {
    setPassMsg(null);
    if (newPassword.length < 6) return setPassMsg("Password minimal 6 karakter.");
    if (newPassword !== confirmPassword) return setPassMsg("Konfirmasi password tidak cocok.");

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) return setPassMsg("Gagal mengubah password: " + error.message);
    setPassMsg("Password berhasil diubah.");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl">
      <div className="card space-y-4">
        <div className="font-display text-[15px] font-semibold">Informasi Akun</div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Nama Pengguna</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Email</label>
          <input value={email} disabled className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-orange-softer text-ink-soft" />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Role</label>
          <input value={roleLabel} disabled className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-orange-softer text-ink-soft" />
        </div>
        {nameMsg && <p className="text-xs text-ink-soft">{nameMsg}</p>}
        <button
          onClick={handleSaveName}
          disabled={savingName}
          className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
        >
          {savingName ? "Menyimpan..." : "Simpan Nama"}
        </button>
      </div>

      <div className="card space-y-4">
        <div className="font-display text-[15px] font-semibold">Ganti Password</div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Password Baru</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Konfirmasi Password Baru</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>
        {passMsg && <p className="text-xs text-ink-soft">{passMsg}</p>}
        <button
          onClick={handleChangePassword}
          disabled={savingPassword}
          className="bg-teal text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
        >
          {savingPassword ? "Menyimpan..." : "Ubah Password"}
        </button>
      </div>
    </div>
  );
}
