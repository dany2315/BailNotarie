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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
const navigation = [
  { name: "Dashboard", href: "/interface", icon: LayoutDashboard },
  { name: "Baux", href: "/interface/baux", icon: FileText },
  { name: "Clients", href: "/interface/clients", icon: Users },
  { name: "Biens", href: "/interface/properties", icon: Building2 },
  { name: "Intakes", href: "/interface/intakes", icon: LinkIcon },
  { name: "Paramètres", href: "/interface/settings", icon: Settings },
];

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
                let isActive;
                if (item.name === "Dashboard") {
                  // Dashboard est actif uniquement pour /interface ou /interface/
                  isActive = pathname === item.href || pathname === item.href + "/";
                } else {
                  // Pour les autres items, actif si le pathname correspond ou commence par l'href
                  isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                }
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Chargement...</div>
      </div>
    );
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
            <div className="flex items-center gap-x-2 sm:gap-x-4 flex-shrink-0">
              <NotificationsDropdown />
            </div>
          </div>
        </header>
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

