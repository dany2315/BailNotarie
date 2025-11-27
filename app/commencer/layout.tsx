import type { Metadata } from "next";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";

export const metadata: Metadata = generateDynamicMetadata({ page: 'creerBailNotarié' });

export default function CommencerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


