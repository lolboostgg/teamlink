import { redirect } from "next/navigation";
import { requireOnboardedTeammate } from "@/lib/teammateGate";

export default async function TeammateChatPage() {
  await requireOnboardedTeammate();
  redirect("/dashboard/teammate/sessions");
}
