import { Suspense } from "react";
import type { Metadata } from "next";
import { TestEspaceClient } from "./test-espace-client";

/* Page de travail : elle ne doit pas être indexée ni apparaître dans les
   résultats de recherche. */
export const metadata: Metadata = {
  title: "Maquette espace client — BailNotarie",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function TestEspaceClientPage() {
  return (
    <Suspense fallback={null}>
      <TestEspaceClient />
    </Suspense>
  );
}
