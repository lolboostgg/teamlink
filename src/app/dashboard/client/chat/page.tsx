import type { Metadata } from "next";
import { DashboardChat } from "@/components/dashboard/chat/DashboardChat";
import { CLIENT_CONVERSATIONS } from "@/lib/dashboard/chatData";

export const metadata: Metadata = { title: "Chat" };

export default function ClientChatPage() {
  return <DashboardChat conversations={CLIENT_CONVERSATIONS} />;
}
