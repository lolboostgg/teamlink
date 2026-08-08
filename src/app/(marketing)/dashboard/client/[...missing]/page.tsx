import { redirect } from "next/navigation";

/**
 * Anything under /dashboard/client that matches no real page.
 *
 * A static route always beats this one, so it only ever sees URLs that had
 * nowhere else to go. Separate from not-found.tsx on purpose: that file
 * handles notFound() raised by a page that *did* match, this handles a URL
 * that never matched at all, and Next resolves the two by different paths.
 */
export default function clientMissing(): never {
  redirect("/dashboard/client");
}
