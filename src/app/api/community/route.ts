import { NextResponse } from "next/server";
import { getCommunityStats } from "@/lib/community";

// The numbers move a few times a day at most and every visitor asks for them,
// so this is cached rather than run per visit.
export const revalidate = 60;

/**
 * The rating summary, for the sections that render on the client.
 *
 * Everything it returns is a count or an average of rows — see lib/community.
 * Reviews carry a rating and no text, so this is a distribution and not a set
 * of testimonials: a quote we cannot source is a quote we should not print.
 */
export async function GET() {
  return NextResponse.json(await getCommunityStats());
}
