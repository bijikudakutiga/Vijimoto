"use client";

import { useState, useTransition } from "react";
import {
  createUser,
  updateUserRole,
  toggleUserActive,
  createRole,
  updatePermission,
} from "@/app/(app)/pengaturan/manajemen-akses/actions";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role_id: string;
  roles: { name: string; label: string } | null;
};
type Role = { id: string; name: string; label: string; is_system: boolean };
type Module = { id: string; key: string; label: string };
type Permission = {
  id: string;
  role_id: string;
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
};

const PERM_FIELDS = [
  ["can_view", "Lihat"],
  ["can_create", "Tambah"],
  ["can_edit", "Ubah"],
  ["can_delete", "Hapus"],
  ["can_approve", "Approve"],
] as const;

export function AccessManagement({
  users,
  roles,
  modules,
  permissions,
}: {
  users: UserRow[];
  roles: Role[];
  modules: Module[];
  permissions: Permission[];
}) {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", roleId: roles[0]?.id ?? "" });

  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", label: "" });

  const [selectedRoleId, setSelectedRoleId] = useState(roles.find((r) => r.name !== "super_admin")?.id ?? roles[0]?.id ?? "");

  function permFor(roleId: string, moduleId: string) {
    return permissions.find((p) => p.role_id === roleId && p.module_id === moduleId);
  }

  async function handleCreateUser() {
    setError(null);
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      setError("Semua field wajib diisi.");
      return;
    }
    startTransition(async () => {
      try {
        await createUser(newUser);
        setShowAddUser(false);
        setNewUser({ email: "", password: "", fullName: "", roleId: roles[0]?.id ?? "" });
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  async function handleCreateRole() {
    setError(null);
    if (!newRole.name || !newRole.label) {
      setError("Nama role wajib diisi.");
      return;
    }
    startTransition(async () => {
      try {
        await createRole(newRole.name.toLowerCase().replace(/\s+/g, "_"), newRole.label);
        setShowAddRole(false);
        setNewRole({ name: "", label: "" });
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("users")}
          className={`text-xs font-semibold px-3.5 py-1.5 rounded-pill ${tab === "users" ? "bg-teal text-white" : "bg-orange-soft text-orange-deep"}`}
        >
          Pengguna
        </button>
        <button
          onClick={() => setTab("roles")}
          className={`text-xs font-semibold px-3.5 py-1.5 rounded-pill ${tab === "roles" ? "bg-teal text-white" : "bg-orange-soft text-orange-deep"}`}
        >
          Role &amp; Hak Akses
        </button>
      </div>

      {error && <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2 mb-4">{error}</p>}

      {tab === "users" && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="font-display text-[15px] font-semibold">Daftar Pengguna</div>
            <button
              onClick={() => setShowAddUser(true)}
              className="text-xs font-semibold bg-orange text-white rounded-pill px-4 py-2"
            >
              + Pengguna Baru
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
                <th className="pb-2.5 pr-3">Nama</th>
                <th className="pb-2.5 pr-3">Email</th>
                <th className="pb-2.5 pr-3">Role</th>
                <th className="pb-2.5 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{u.full_name}</td>
                  <td className="py-2.5 pr-3 text-xs text-ink-soft">{u.email}</td>
                  <td className="py-2.5 pr-3">
                    {u.roles?.name === "super_admin" ? (
                      <span className="text-xs font-semibold">{u.roles?.label}</span>
                    ) : (
                      <select
                        defaultValue={u.role_id}
                        onChange={(e) => startTransition(() => updateUserRole(u.id, e.target.value))}
                        className="text-xs rounded-lg border border-line px-2 py-1 bg-white"
                      >
                        {roles.filter((r) => r.name !== "super_admin").map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {u.roles?.name === "super_admin" ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-pill badge-green">Aktif</span>
                    ) : (
                      <button
                        onClick={() => startTransition(() => toggleUserActive(u.id, !u.is_active))}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-pill ${u.is_active ? "badge-green" : "badge-red"}`}
                      >
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="font-display text-[15px] font-semibold">Hak Akses per Role</div>
            <button
              onClick={() => setShowAddRole(true)}
              className="text-xs font-semibold bg-orange text-white rounded-pill px-4 py-2"
            >
              + Role Baru
            </button>
          </div>

          <div className="flex gap-1.5 mb-4 flex-wrap">
            {roles.filter((r) => r.name !== "super_admin").map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-pill ${selectedRoleId === r.id ? "bg-orange text-white" : "bg-orange-soft text-orange-deep"}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
                <th className="pb-2.5 pr-3">Modul</th>
                {PERM_FIELDS.map(([field, label]) => (
                  <th key={field} className="pb-2.5 pr-3 text-center">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const perm = permFor(selectedRoleId, m.id);
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{m.label}</td>
                    {PERM_FIELDS.map(([field]) => (
                      <td key={field} className="py-2.5 pr-3 text-center">
                        <input
                          type="checkbox"
                          defaultChecked={perm ? (perm as any)[field] : false}
                          onChange={(e) =>
                            startTransition(() =>
                              updatePermission(selectedRoleId, m.id, field, e.target.checked)
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-ink-soft mt-3">
            Super Admin selalu memiliki akses penuh ke semua modul dan tidak ditampilkan di sini.
          </p>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="font-display text-lg font-semibold">Pengguna Baru</div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Nama</label>
              <input value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Email</label>
              <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Password Awal</label>
              <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Role</label>
              <select value={newUser.roleId} onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm bg-white">
                {roles.filter((r) => r.name !== "super_admin").map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreateUser} disabled={isPending}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60">
                {isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowAddUser(false)} className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddRole && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="font-display text-lg font-semibold">Role Baru</div>
            <div>
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Nama Tampilan</label>
              <input value={newRole.label} onChange={(e) => setNewRole({ ...newRole, label: e.target.value })}
                placeholder="Admin Gudang" className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreateRole} disabled={isPending}
                className="bg-orange text-white text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60">
                {isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowAddRole(false)} className="text-sm font-semibold text-ink-soft rounded-pill px-4 py-2">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
