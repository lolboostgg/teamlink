import type { SignupRow } from "@/lib/dashboard/adminData";

export function SignupsTable({ signups }: { signups: SignupRow[] }) {
  return (
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Joined</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {signups.map((s) => (
          <tr key={s.id}>
            <td className="dashboard-table__primary">{s.name}</td>
            <td>{s.email}</td>
            <td>{s.joined}</td>
            <td>
              <span className={`dashboard-pill ${s.role === "teammate" ? "dashboard-pill--success" : "dashboard-pill--muted"}`}>
                {s.role}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
