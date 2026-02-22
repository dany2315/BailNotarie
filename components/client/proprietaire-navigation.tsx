"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Home, Plus, User, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Dashboard", href: "/client/proprietaire", icon: LayoutDashboard },
  { name: "Demandes", href: "/client/proprietaire/demandes", icon: ClipboardList },
  { name: "Mes informations", href: "/client/proprietaire/informations", icon: User },
];

export function ProprietaireNavigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Navigation Desktop - Tabs horizontales */}
      <nav className="hidden md:flex items-center gap-1 border-b bg-background">
        <div className="flex items-center gap-1 px-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/client/proprietaire" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent",
                  isActive
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/client/proprietaire/demandes?open=bien-new" className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  Créer un bien
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/client/proprietaire/demandes?open=bail-new" className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Créer un bail
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Navigation Mobile - Tabs horizontales scrollables */}
      <nav className="md:hidden border-b bg-background">
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide pr-16">
          <div className="flex items-center gap-2 min-w-max">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/client/proprietaire" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary-foreground text-muted-foreground hover:bg-primary-foreground/70"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="fixed right-3 ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full px-2.5 bg-primary-foreground  text-primary">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/client/proprietaire/demandes?open=bien-new" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    Créer un bien
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/proprietaire/demandes?open=bail-new" className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    Créer un bail
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </>
  );
}

