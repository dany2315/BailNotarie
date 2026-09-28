import type { Metadata } from "next";

import { ChatPreview } from "@/components/chat-v2/chat-preview";

/* Page de travail : ni indexée, ni listée. */
export const metadata: Metadata = {
  title: "Maquette messagerie — BailNotarie",
  robots: { index: false, follow: false },
};

export default function TestChatPage() {
  return <ChatPreview />;
}
