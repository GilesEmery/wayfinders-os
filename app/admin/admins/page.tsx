import {
  AdminInviteForm,
  AdminStatusButton,
} from "@/components/admin/AdminMembersManager";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
export default async function Page() {
  const identity = await requireSuperAdmin();
  const { data: memberData } = await createAdminSupabaseClient()
    .from("admin_members")
    .select("id,email,role,status,auth_user_id,created_at,last_login_at")
    .order("created_at");
  const members = memberData ?? [];
  return (
    <AdminShell admin={identity}>
      <p className="admin-kicker">Administration</p>
      <h1>Administrators</h1>
      <p className="admin-lede">
        Add and manage authorized Purpose OS administrators. New administrators must accept the secure invitation sent to their email address.
      </p>
      <section className="admin-admin-invite">
        <h2>Add administrator</h2>
        <AdminInviteForm />
      </section>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Invited</th>
              <th>Last login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.email}</td>
                <td>{humanize(member.role)}</td>
                  <td>{member.status === "invited" ? "Invited / Not yet activated" : humanize(member.status)}</td>
                <td>{formatDate(member.created_at)}</td>
                <td>{formatDate(member.last_login_at)}</td>
                <td>
                  <AdminStatusButton
                    memberId={member.id}
                    status={member.status}
                    isSelf={member.auth_user_id === identity.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
