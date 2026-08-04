import { TeammateOrdersHistory } from "@/components/dashboard/teammate/TeammateOrdersHistory";
import { requireOnboardedTeammate } from "@/lib/teammateGate";

export default async function TeammateSessionsPage() {
  await requireOnboardedTeammate();
  return <TeammateOrdersHistory />;
}
