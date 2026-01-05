"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/formatters";
import { BailStatus, ProfilType, ClientType } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, FileText, CircleDot, CheckCircle2 as CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Person {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  isPrimary: boolean;
}

interface Entreprise {
  id: string;
  legalName: string;
  name: string;
  email: string;
}

interface Party {
  id: string;
  type: ClientType;
  profilType: ProfilType;
  persons?: Person[];
  entreprise?: Entreprise | null;
}

interface Bail {
  id: string;
  status: BailStatus;
  updatedAt: string | Date;
  property: {
    id: string;
    fullAddress: string;
  };
  parties: Party[];
}

interface BailsListDashboardProps {
  bails: Bail[];
}

export function BailsListDashboard({ bails: initialBails }: BailsListDashboardProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Filtrer les baux
  const filteredBails = React.useMemo(() => {
    let filtered = [...initialBails];

    // Filtrer par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((bail) => bail.status === statusFilter);
    }

    // Filtrer par recherche
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter((bail) => {
        const address = (bail.property?.fullAddress || "").toLowerCase();
        const hasMatch = address.includes(searchLower);
        
        // Vérifier aussi dans les parties
        const partyMatch = bail.parties?.some((party) => {
          // Pour une personne physique, chercher dans les persons
          if (party.type === ClientType.PERSONNE_PHYSIQUE && party.persons) {
            return party.persons.some((person) => {
              const firstName = (person.firstName || "").toLowerCase();
              const lastName = (person.lastName || "").toLowerCase();
              const email = (person.email || "").toLowerCase();
              const fullName = `${firstName} ${lastName}`.trim();
              return (
                firstName.includes(searchLower) ||
                lastName.includes(searchLower) ||
                fullName.includes(searchLower) ||
                email.includes(searchLower)
              );
            });
          }

          // Pour une personne morale, chercher dans l'entreprise
          if (party.type === ClientType.PERSONNE_MORALE && party.entreprise) {
            const legalName = (party.entreprise.legalName || "").toLowerCase();
            const name = (party.entreprise.name || "").toLowerCase();
            const email = (party.entreprise.email || "").toLowerCase();
            return (
              legalName.includes(searchLower) ||
              name.includes(searchLower) ||
              email.includes(searchLower)
            );
          }

          return false;
        });

        return hasMatch || partyMatch;
      });
    }

    return filtered;
  }, [initialBails, statusFilter, search]);

  // Pagination
  const paginatedBails = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredBails.slice(start, end);
  }, [filteredBails, page]);

  const totalPages = Math.ceil(filteredBails.length / pageSize);

  const getClientName = (party: Party) => {
    if (party.type === ClientType.PERSONNE_PHYSIQUE) {
      // Chercher la personne principale ou la première personne
      const primaryPerson = party.persons?.find((p) => p.isPrimary) || party.persons?.[0];
      if (primaryPerson) {
        const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
        return name || primaryPerson.email || "N/A";
      }
      return "N/A";
    }
    // Pour une personne morale
    if (party.entreprise) {
      return party.entreprise.legalName || party.entreprise.name || party.entreprise.email || "N/A";
    }
    return "N/A";
  };

  const hasTenant = (bail: Bail) => {
    return bail.parties?.some((p) => p.profilType === ProfilType.LOCATAIRE) || false;
  };

  const bailStatusOptions: Array<{ value: BailStatus | "all"; label: string; icon: React.ReactNode; colorClasses?: string }> = [
    { value: "all", label: "Tous les statuts", icon: null },
    { value: "DRAFT", label: "Brouillon", icon: <FileText className="h-4 w-4" /> },
    { value: "PENDING_VALIDATION", label: "En validation", icon: <CircleDot className="h-4 w-4" /> },
    { value: "READY_FOR_NOTARY", label: "Prêt pour notaire", icon: <CheckCircle2Icon className="h-4 w-4" /> },
    { value: "SIGNED", label: "Signé", icon: <CheckCircle2Icon className="h-4 w-4" /> },
    { value: "TERMINATED", label: "Terminé", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <Card className="flex flex-col lg:h-full min-h-0">
      <CardHeader className="shrink-0">
        <CardTitle className="text-lg sm:text-xl">Liste des baux</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un bail..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              {bailStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon && <span className="text-foreground">{option.icon}</span>}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 lg:overflow-y-auto">
        {filteredBails.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun bail trouvé
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedBails.map((bail) => {
                const tenant = bail.parties?.find((p) => p.profilType === ProfilType.LOCATAIRE);
                const owner = bail.parties?.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
                
                return (
                  <Link
                    key={bail.id}
                    href={`/interface/baux/${bail.id}`}
                    className="block"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            Bail #{bail.id.slice(-8).toUpperCase()}
                          </p>
                          <StatusBadge status={bail.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {bail.property?.fullAddress || "N/A"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {hasTenant(bail) ? (
                            <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Locataire: {tenant ? getClientName(tenant) : "Oui"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pas de locataire
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Modifié le {formatDate(bail.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {filteredBails.length} bail{filteredBails.length > 1 ? "x" : ""} au total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

