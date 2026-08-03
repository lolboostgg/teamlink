import { redirect } from "next/navigation";

// Profile editing lives in Settings now (Profile / Notifications /
// Connected accounts / Security), so the old standalone page just forwards —
// old links and the header's "My profile" item keep working.
export default function ClientProfilePage() {
  redirect("/dashboard/client/settings");
}
