"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || !data) throw new Error("Hanya Super Admin yang boleh melakukan ini.");
}

export async function createUser(formData: {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
}) {
  await assertSuperAdmin();
  const admin = createAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
  });
  if (authError || !created.user) {
    throw new Error(authError?.message ?? "Gagal membuat user.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: formData.fullName,
    email: formData.email,
    role_id: formData.roleId,
  });
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/pengaturan/manajemen-akses");
}

export async function updateUserRole(userId: string, roleId: string) {
  await assertSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role_id: roleId }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/pengaturan/manajemen-akses");
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await assertSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/pengaturan/manajemen-akses");
}

export async function createRole(name: string, label: string) {
  await assertSuperAdmin();
  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .insert({ name, label, is_system: false })
    .select("id")
    .single();
  if (error || !role) throw new Error(error?.message ?? "Gagal membuat role.");

  const { data: modules } = await supabase.from("modules").select("id");
  if (modules?.length) {
    await supabase.from("role_permissions").insert(
      modules.map((m) => ({ role_id: role.id, module_id: m.id }))
    );
  }
  revalidatePath("/pengaturan/manajemen-akses");
}

export async function updatePermission(
  roleId: string,
  moduleId: string,
  field: "can_view" | "can_create" | "can_edit" | "can_delete" | "can_approve",
  value: boolean
) {
  await assertSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .update({ [field]: value })
    .eq("role_id", roleId)
    .eq("module_id", moduleId);
  if (error) throw new Error(error.message);
  revalidatePath("/pengaturan/manajemen-akses");
}
