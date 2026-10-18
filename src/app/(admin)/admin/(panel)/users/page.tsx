import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createAdminUser, deleteAdminUser, resetAdminPassword, setAdminRole } from "@/app/(admin)/admin/manage-actions";
import Field from "@/components/admin/Field";

const MSG: Record<string, string> = {
  email: "Enter a valid email address.", role: "Choose a role.", password: "The temporary password must be 12 to 200 characters.",
  exists: "An admin with that email already exists.", self: "You cannot change or delete your own account here.",
  lastowner: "There must always be at least one owner.",
};
const ROLE_HELP = "Owner: everything, including users. Manager: catalog, orders, shipping, settings, reports. Staff: view-only areas (products, categories, orders list).";

export default async function Users({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const me = await requireAdmin(["owner"]);
  const q = await searchParams;
  const users = await sql<{ id: string; email: string; role: string; created_at: Date; must_change_password: boolean }[]>`
    select id, email, role, created_at, must_change_password from admin_users order by created_at`;
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Security</p>
        <h1 className="text-3xl font-semibold mt-1">Admin users</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">{ROLE_HELP} New and reset accounts must choose their own password at first sign-in.</p>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Could not save."}</p>}

      <form action={createAdminUser} className="a-card p-5 mb-6 grid gap-4 md:grid-cols-4 items-end">
        <Field label="Email"><input name="email" type="email" required autoComplete="off" className="a-input" /></Field>
        <Field label="Role">
          <select name="role" defaultValue="staff" className="a-input"><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select>
        </Field>
        <Field label="Temporary password (12+ characters)"><input name="password" type="password" required minLength={12} autoComplete="new-password" className="a-input" /></Field>
        <button className="a-btn">Add admin</button>
      </form>

      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className="a-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold break-all" dir="ltr">{u.email}{u.id === me.id && <span className="ml-2 text-xs text-[#a8864a]">(you)</span>}</p>
              <p className="text-xs text-neutral-500">Added {u.created_at.toISOString().slice(0, 10)}{u.must_change_password ? " · must change password" : ""}</p>
            </div>
            {u.id !== me.id && (
              <div className="flex flex-wrap items-end gap-3">
                <form action={setAdminRole} className="flex gap-2 items-end">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="a-input !w-32" aria-label="Role"><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select>
                  <button className="a-btn-ghost">Set role</button>
                </form>
                <form action={resetAdminPassword} className="flex gap-2 items-end">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="password" type="password" minLength={12} required placeholder="New temporary password" autoComplete="new-password" className="a-input !w-56" />
                  <button className="a-btn-ghost">Reset password</button>
                </form>
                <form action={deleteAdminUser}><input type="hidden" name="id" value={u.id} /><button className="a-btn-ghost !text-red-700">Remove</button></form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
