"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { getClientInfoForHeader } from "@/lib/actions/client-info";
import { Button } from "@/components/ui/button";
import { LogOut, User, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfilType } from "@prisma/client";

interface ClientInfo {
  name: string | null;
  email: string | null;
  clientType: "entreprise" | "particulier" | null;
  profilType: ProfilType | null;
}

export function HeaderClientInfo() {
  const router = useRouter();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ clientId: string | null; role: string } | null>(null);

  // Récupérer l'utilisateur actuel via l'API
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch("/api/user/current");
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setCurrentUser({ clientId: data.user.clientId, role: data.user.role });
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        setCurrentUser(null);
      }
    }

    fetchCurrentUser();
  }, []);

  // Récupérer les infos du client une fois qu'on a le clientId
  useEffect(() => {
    async function fetchClientInfo() {
      if (!currentUser?.clientId) {
        setClientInfo(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const info = await getClientInfoForHeader(currentUser.clientId);
        setClientInfo(info as ClientInfo);
      } catch (error) {
        console.error("Erreur lors de la récupération des informations du client:", error);
        setClientInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (currentUser) {
      fetchClientInfo();
    }
  }, [currentUser?.clientId]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  // Ne pas afficher si l'utilisateur n'est pas un client
  if (!currentUser || currentUser.role !== "UTILISATEUR" || !currentUser.clientId) {
    return null;
  }

  // Afficher un skeleton pendant le chargement des infos client
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3">
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex flex-col gap-1">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Ne pas afficher si pas d'infos client
  if (!clientInfo) {
    return null;
  }

  const displayName = clientInfo.name || "Client";
  const displayEmail = clientInfo.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CL";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex justify-between items-center gap-2 h-auto py-2 px-3 w-full hover:bg-blue-50 rounded-lg transition-colors"
        >
            <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500">{displayEmail}</span>
          </div>
          {clientInfo.clientType === "entreprise" ? (
            <Building2 className="h-4 w-4 text-gray-500 hidden md:block" />
          ) : (
            <User className="h-4 w-4 text-gray-500 hidden md:block" />
          )}
          </div>
          <ChevronUp className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{displayName}</p>
                <Badge className="bg-blue-100 text-blue-700 text-xs">
                    {clientInfo.profilType === ProfilType.PROPRIETAIRE ? "Propriétaire" : "Locataire"}
                </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/client" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Mon espace client
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
