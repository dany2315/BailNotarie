"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table/data-table";
import { ClientActions } from "@/components/clients/client-actions";
import { CompletionStatusMultiSelect } from "@/components/shared/completion-status-multi-select";
import { ProfilType, CompletionStatus } from "@prisma/client";
import { ClientType } from "@prisma/client";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  type: ClientType;
  profilType: ProfilType;
  completionStatus?: CompletionStatus;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  persons?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  entreprise?: {
    legalName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  createdAt: Date | string;
  createdBy?: any;
}

interface ClientsTableClientProps {
  initialData: Client[];
  columns: Column<Client>[];
}

// Hook pour debouncer les valeurs
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function ClientsTableClient({ initialData, columns }: ClientsTableClientProps) {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300); // Debounce 300ms
  const [profilTypeFilter, setProfilTypeFilter] = React.useState<ProfilType | "ALL">("ALL");
  const [completionStatusFilter, setCompletionStatusFilter] = React.useState<CompletionStatus[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [isPending, startTransition] = React.useTransition();

  const profileTabs = React.useMemo(() => {
    const tabs: Array<{ value: ProfilType | "ALL"; label: string }> = [
      { value: "ALL", label: "Tous" },
      { value: ProfilType.PROPRIETAIRE, label: "Propriétaires" },
      { value: ProfilType.LOCATAIRE, label: "Locataires" },
      { value: ProfilType.LEAD, label: "Leads" },
    ];

    return tabs.map((tab) => ({
      ...tab,
      count: tab.value === "ALL"
        ? initialData.length
        : initialData.filter((client) => client.profilType === tab.value).length,
    }));
  }, [initialData]);

  // Filtrer les données côté client - utilise debouncedSearch pour éviter les re-renders à chaque frappe
  const filteredData = React.useMemo(() => {
    let filtered = initialData;

    // Filtrer par profil (onglets)
    if (profilTypeFilter !== "ALL") {
      filtered = filtered.filter((client) => client.profilType === profilTypeFilter);
    }

    // Filtrer par statut de completion (multi-select)
    if (completionStatusFilter.length > 0) {
      filtered = filtered.filter((client) => 
        client.completionStatus && completionStatusFilter.includes(client.completionStatus)
      );
    }

    // Filtrer par recherche (nom, prénom, raison sociale, email) - DEBOUNCED
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase().trim();
      filtered = filtered.filter((client) => {
        const personFields = (client.persons || []).flatMap((person) => [
          person.firstName,
          person.lastName,
          `${person.firstName || ""} ${person.lastName || ""}`.trim(),
          person.email,
          person.phone,
        ]);

        const searchableValues = [
          client.firstName,
          client.lastName,
          `${client.firstName || ""} ${client.lastName || ""}`.trim(),
          client.legalName,
          client.email,
          client.phone,
          client.entreprise?.legalName,
          client.entreprise?.name,
          client.entreprise?.email,
          client.entreprise?.phone,
          ...personFields,
        ];

        return searchableValues.some((value) =>
          (value || "").toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [initialData, profilTypeFilter, completionStatusFilter, debouncedSearch]);

  // Calculer les connexions AVANT la pagination pour pouvoir réorganiser
  const connectionsMap = React.useMemo(() => {
    const connMap = new Map<string, string[]>();
    
    filteredData.forEach((client: any) => {
      if (!client.bails || !Array.isArray(client.bails)) return;
      
      const connectedIds: string[] = [];
      const currentProfilType = String(client.profilType);
      const oppositeProfilType = currentProfilType === "LOCATAIRE" ? "PROPRIETAIRE" : "LOCATAIRE";
      
      client.bails.forEach((bail: any) => {
        if (!bail.parties || !Array.isArray(bail.parties)) return;
        
        const oppositeParties = bail.parties.filter(
          (party: any) => party.id !== client.id && String(party.profilType) === oppositeProfilType
        );
        
        oppositeParties.forEach((party: any) => {
          // Vérifier que le client connecté est dans les données filtrées
          const isInFiltered = filteredData.some((c: any) => c.id === party.id);
          if (!connectedIds.includes(party.id) && isInFiltered) {
            connectedIds.push(party.id);
          }
        });
      });
      
      if (connectedIds.length > 0) {
        connMap.set(client.id, connectedIds);
      }
    });
    
    return connMap;
  }, [filteredData]);

  // Réorganiser les données pour placer les clients connectés côte à côte
  const reorganizedData = React.useMemo(() => {
    const result: any[] = [];
    const processed = new Set<string>();
    const clientMap = new Map(filteredData.map((c: any) => [c.id, c]));
    
    filteredData.forEach((client: any) => {
      if (processed.has(client.id)) return;
      
      // Si ce client a des connexions, les regrouper ensemble
      const connectedIds = connectionsMap.get(client.id);
      if (connectedIds && connectedIds.length > 0) {
        // Ajouter le client actuel
        result.push(client);
        processed.add(client.id);
        
        // Ajouter tous les clients connectés juste après
        connectedIds.forEach((connectedId) => {
          if (!processed.has(connectedId)) {
            const connectedClient = clientMap.get(connectedId);
            if (connectedClient) {
              result.push(connectedClient);
              processed.add(connectedId);
            }
          }
        });
      } else {
        // Client sans connexion, l'ajouter normalement
        result.push(client);
        processed.add(client.id);
      }
    });
    
    return result;
  }, [filteredData, connectionsMap]);

  // Pagination côté client
  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return reorganizedData.slice(start, end);
  }, [reorganizedData, page, pageSize]);

  const totalPages = Math.ceil(reorganizedData.length / pageSize);

  // Créer un Set des IDs des clients visibles dans la page actuelle pour vérification rapide
  const visibleClientIds = React.useMemo(() => {
    return new Set(paginatedData.map((client: any) => client.id));
  }, [paginatedData]);

  // Calculer les connexions entre clients (uniquement pour ceux visibles dans la page)
  const connections = React.useMemo(() => {
    const connMap = new Map<string, string[]>();
    
    paginatedData.forEach((client: any) => {
      const connectedIds = connectionsMap.get(client.id);
      if (connectedIds && connectedIds.length > 0) {
        // Filtrer pour ne garder que ceux visibles dans la page actuelle
        const visibleConnected = connectedIds.filter(id => visibleClientIds.has(id));
        if (visibleConnected.length > 0) {
          connMap.set(client.id, visibleConnected);
        }
      }
    });
    
    return connMap;
  }, [paginatedData, visibleClientIds, connectionsMap]);

  // Refs pour les lignes du tableau
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement>>(new Map());
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [connectionLines, setConnectionLines] = React.useState<Array<{ from: string; to: string; fromTop: number; toTop: number }>>([]);

  // Calculer les positions des lignes pour les flèches - optimisé avec requestAnimationFrame
  React.useEffect(() => {
    let rafId: number;
    let mounted = true;
    
    function calculateLines() {
      if (!mounted || !tableContainerRef.current || rowRefs.current.size === 0) return;
      
      const lines: Array<{ from: string; to: string; fromTop: number; toTop: number }> = [];
      const tableElement = tableContainerRef.current.querySelector('table');
      if (!tableElement) return;
      
      const containerRect = tableContainerRef.current.getBoundingClientRect();
      
      connections.forEach((connectedIds, clientId) => {
        const fromRow = rowRefs.current.get(clientId);
        if (!fromRow) return;
        
        const fromRect = fromRow.getBoundingClientRect();
        const fromCenterY = fromRect.top - containerRect.top + fromRect.height / 2 + 10;
        
        connectedIds.forEach((connectedId) => {
          const toRow = rowRefs.current.get(connectedId);
          if (!toRow) return;
          
          const toRect = toRow.getBoundingClientRect();
          const toCenterY = toRect.top - containerRect.top + toRect.height / 2;
          
          lines.push({
            from: clientId,
            to: connectedId,
            fromTop: fromCenterY,
            toTop: toCenterY,
          });
        });
      });
      
      if (mounted) {
        setConnectionLines(lines);
      }
    }
    
    // Utiliser requestAnimationFrame pour ne pas bloquer l'UI
    rafId = requestAnimationFrame(calculateLines);
    
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
    };
  }, [connections, paginatedData]);

  return (
    <div className="relative" ref={tableContainerRef}>
      <DataTable
        data={paginatedData}
        columns={columns}
        total={filteredData.length}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        searchPlaceholder="Rechercher par nom, prénom, raison sociale, email..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        belowSearchContent={
          <div className="flex flex-wrap gap-2">
            {profileTabs.map((tab) => {
              const active = profilTypeFilter === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      setProfilTypeFilter(tab.value);
                      setPage(1);
                    });
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                  aria-pressed={active}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        }
        filters={
          <CompletionStatusMultiSelect
            value={completionStatusFilter}
            onValueChange={(value) => {
              startTransition(() => {
                setCompletionStatusFilter(value);
                setPage(1);
              });
            }}
          />
        }
        actions={ClientActions}
        rowRefs={rowRefs}
      />
      
      {/* Indicateurs de connexion - positionnés de manière absolue par rapport au conteneur */}
      {connectionLines.length > 0 && (
        <div className="absolute left-0 top-0 w-10 h-full pointer-events-none z-20">
          {connectionLines.map((line, index) => {
            const midY = (line.fromTop + line.toTop) / 2 - 4;
            
            return (
              <div
                key={`arrow-${line.from}-${line.to}-${index}`}
                className="absolute flex items-center justify-center size-7 rounded-full bg-background border-2 border-blue-500 shadow-lg"
                style={{
                  left: '55px',
                  top: `${midY}px`,
                  transform: 'translateY(-50%)',
                }}
              >
                <ArrowUpDown className="size-4 text-blue-600" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}








