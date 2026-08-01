import type { Metadata } from "next";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import { TEAMMATE_CONVERSATIONS } from "@/lib/dashboard/chatData";

export const metadata: Metadata = { title: "Chat" };

export default function TeammateChatPage() {
  return <DashboardChat conversations={TEAMMATE_CONVERSATIONS} />;
}
