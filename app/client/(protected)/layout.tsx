import { Header } from "@/components/header";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ClientProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

