// The auth modal (see AuthModalProvider.tsx) is mock-only — "signing up"
// just sets a localStorage flag and shows a toast, it never persists a
// name, email, or role anywhere. There's no real signup list to show here,
// and this dashboard doesn't fabricate one — an honest empty state instead.
export function SignupsTable() {
  return (
    <div className="dashboard-empty">
      <i className="fa-solid fa-user-slash" aria-hidden="true" />
      <p>No signup registry in this demo — account creation isn&rsquo;t persisted (see the login modal).</p>
    </div>
  );
}
