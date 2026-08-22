import type { Metadata } from "next";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";
import { StartPageClient } from "@/components/start/start-page-client";

export const metadata: Metadata = generateDynamicMetadata({ page: "creerBailNotarié" });

export default function StartPage() {
  return <StartPageClient />;
}
