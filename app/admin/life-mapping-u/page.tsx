import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, humanize } from "@/lib/admin/format";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const identity = await requireAdmin();
  const { q = "", status = "all" } = await searchParams;
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("lmu_assessments")
    .select(
      "id,status,current_module,started_at,completed_at,updated_at,participants!inner(first_name,email)",
    )
    .order("updated_at", { ascending: false });
  if (status === "completed") query = query.eq("status", "completed");
  if (status === "in_progress") query = query.eq("status", "in_progress");
  if (q.trim())
    query = query.or(
      `first_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`,
      { referencedTable: "participants" },
    );
  const { data: queryData } = await query;
  const data = queryData ?? [];
  const total = data.length,
    completed = data.filter((x) => x.status === "completed").length,
    inProgress = data.filter((x) => x.status === "in_progress").length;
  return (
    <AdminShell admin={identity}>
      <p className="admin-kicker admin-lmu-kicker">Life Mapping U</p>
      <h1>Participant results</h1>
      <div className="admin-metrics">
        <div>
          <span>Total participants</span>
          <strong>{total}</strong>
        </div>
        <div>
          <span>In progress</span>
          <strong>{inProgress}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{completed}</strong>
        </div>
        <div>
          <span>Recent activity</span>
          <strong>{data[0] ? formatDate(data[0].updated_at) : "—"}</strong>
        </div>
      </div>
      <form className="admin-filter">
        <label>
          Search
          <input name="q" defaultValue={q} placeholder="Name or email" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="all">All</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <button className="admin-primary">APPLY</button>
      </form>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Email</th>
              <th>Status</th>
              <th>Current module</th>
              <th>Started</th>
              <th>Last updated</th>
              <th>Completed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const person = Array.isArray(row.participants)
                ? row.participants[0]
                : row.participants;
              return (
                <tr key={row.id}>
                  <td>{person?.first_name}</td>
                  <td>{person?.email}</td>
                  <td>
                    <span className={`admin-status is-${row.status}`}>
                      {humanize(row.status)}
                    </span>
                  </td>
                  <td>{humanize(row.current_module)}</td>
                  <td>{formatDate(row.started_at)}</td>
                  <td>{formatDate(row.updated_at)}</td>
                  <td>{formatDate(row.completed_at)}</td>
                  <td>
                    <Link href={`/admin/life-mapping-u/${row.id}`}>View</Link>
                  </td>
                </tr>
              );
            })}
            {!data.length && (
              <tr>
                <td colSpan={8}>No assessments match this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
