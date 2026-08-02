import type { Metadata } from "next";
import { TeammateChatContent } from "@/components/dashboard/teammate/TeammateChatContent";

export const metadata: Metadata = { title: "Chat" };

export default function TeammateChatPage() {
  return <TeammateChatContent />;
}
