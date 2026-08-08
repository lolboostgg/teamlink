import { redirect } from "next/navigation";

/**
 * No dead ends inside the admin dashboard.
 *
 * A 404 here is almost never a page somebody meant to reach — it is a stale
 * link, a renamed route, or a record that has since been deleted, and a
 * bare "not found" leaves them staring at the shell with nowhere to go.
 * The overview is the one page that always exists and always has something
 * on it, so that is where a miss lands.
 *
 * Catches notFound() thrown anywhere in this segment. Unmatched URLs are
 * caught by the catch-all route next to it, which Next resolves separately.
 */
export default function adminNotFound(): never {
  redirect("/dashboard/admin");
}
