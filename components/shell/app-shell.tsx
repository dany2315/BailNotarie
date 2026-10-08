"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Link as LinkIcon,
  Settings,
  LogOut,
  ChevronUp,
  CreditCard,
  Bell,
  CheckCircle2,
  UserIcon,
  GraduationCap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
// « Paramètres » retiré : la page /interface/settings n'existe pas.
const navigation = [
  { name: "À traiter", href: "/interface", icon: LayoutDashboard, exact: true },
  { name: "Dossiers", href: "/interface/baux", icon: FileText },
  { name: "Clients", href: "/interface/clients", icon: Users },
  { name: "Biens", href: "/interface/properties", icon: Building2 },
  { name: "Notaires", href: "/interface/notaires", icon: GraduationCap },
  { name: "Formulaires envoyés", href: "/interface/intakes", icon: LinkIcon },
  { name: "Notifications", href: "/interface/notifications", icon: Bell },
];

function isNavActive(item: (typeof navigation)[number], pathname: string | null) {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href || pathname === item.href + "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/**
 * Navigation sur téléphone : une seule ligne qui défile sous l'en-tête, pour
 * changer de section sans ouvrir le menu latéral (qui garde le compte et la
 * déconnexion).
 */
function MobileNav() {
  const pathname = usePathname();
  const listRef = React.useRef<HTMLUListElement>(null);

  // Garder la section active visible (ex. « Notifications », en fin de ligne).
  React.useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Navigation" className="border-b bg-background md:hidden">
      <ul ref={listRef} className="flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navigation.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar, isMobile } = useSidebar();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      window.location.href = "/login";
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <Sidebar collapsible="icon" variant="inset" >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/interface" >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-sidebar-primary text-sidebar-primary-foreground ">
                  <Image src="/logoAvec.png" alt="BailNotarie" width={100} height={100} className=" w-full" />
                </div>
                {state === "expanded" && <div className="grid flex-1 text-left text-sm leading-tight  ">
                  <span className="truncate font-semibold">BailNotarie</span>
                </div>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = isNavActive(item, pathname);
                return (
                  <SidebarMenuItem key={item.name} >
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name} >
                      <Link href={item.href} onClick={isMobile ? () => toggleSidebar() : undefined}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Utilisateur" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                 <UserIcon className="size-4" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.name || "Utilisateur"}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {session?.user?.email || ""}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8">
                      <AvatarImage src={session?.user?.image || ""} width={32} height={32} className="object-cover" />
                      <AvatarFallback className="bg-indigo-200 text-white">
                        {session?.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session?.user?.name || "Utilisateur"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session?.user?.email || ""}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Rediriger vers login si l'utilisateur n'est pas connecté
  React.useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <LoadingScreen message="Chargement..." />;
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="rounded-xl overflow-hidden shadow-4xl ">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b bg-background px-2 sm:px-6 lg:px-8">
          <SidebarTrigger className="pl-4 sm:p-0 flex-shrink-0 mr-4" />
          <Separator orientation="vertical" className=" sm:block" />
          <div className="flex flex-1 gap-x-2 sm:gap-x-4 self-stretch lg:gap-x-6 min-w-0 ml-2">
            <div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-6 flex-1 min-w-0 overflow-hidden">
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-x-2 sm:gap-x-4 ">
              <NotificationsDropdown />
            </div>
          </div>
        </header>
        <MobileNav />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

