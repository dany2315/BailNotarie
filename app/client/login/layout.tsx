import { Header } from "@/components/header";

export default function ClientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <Header />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}


