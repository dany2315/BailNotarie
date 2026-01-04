"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Search, X, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: React.ComponentType<{ row: T }> | ((row: T) => React.ReactNode);
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  filters?: React.ReactNode;
  actions?: React.ComponentType<{ row: T }> | ((row: T) => React.ReactNode);
  rowRefs?: React.MutableRefObject<Map<string, HTMLTableRowElement>>;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  total,
  page,
  pageSize,
  totalPages,
  searchPlaceholder = "Rechercher...",
  onSearch,
  onPageChange,
  onPageSizeChange,
  filters,
  actions,
  rowRefs,
}: DataTableProps<T>) {
  // Si onPageChange est fourni, utiliser le mode client-side (pas d'URL)
  // Sinon, utiliser l'URL (mode serveur)
  const isClientSide = !!onPageChange;
  
  // Les hooks doivent être appelés de manière inconditionnelle
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const initialSearch = isClientSide ? "" : (searchParams.get("search") || "");
  const [search, setSearch] = React.useState(initialSearch);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (isClientSide) {
      // Mode client-side : juste appeler le callback
      onSearch?.(value);
    } else {
      // Mode serveur : mettre à jour l'URL
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set("search", value);
          params.set("page", "1");
        } else {
          params.delete("search");
        }
        router.replace(`?${params.toString()}`);
      });
      onSearch?.(value);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isClientSide) {
      onPageChange?.(newPage);
    } else {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString());
        router.replace(`?${params.toString()}`);
      });
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize, 10);
    if (isClientSide) {
      onPageSizeChange?.(size);
    } else {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        params.set("pageSize", newPageSize);
        params.set("page", "1");
        router.replace(`?${params.toString()}`);
      });
    }
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilters = React.Children.count(filters) > 0;

  // Compter les filtres actifs (basé sur les enfants React avec une valeur)
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    React.Children.forEach(filters, (child) => {
      if (React.isValidElement(child)) {
        const props = child.props as { value?: unknown[] };
        if (props.value && Array.isArray(props.value) && props.value.length > 0) {
          count++;
        }
      }
    });
    return count;
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-2">
        {/* Ligne principale: recherche + bouton filtres (mobile) ou filtres inline (desktop) */}
        <div className="flex items-center gap-2">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-9 h-10 text-sm rounded-lg border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-8 hover:bg-muted/80"
                onClick={() => handleSearch("")}
              >
                <X className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>

          {/* Mobile: bouton filtres avec badge */}
          {filters && (
            <Button
              variant={activeFiltersCount > 0 ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "md:hidden h-10 px-3 gap-2 shrink-0 rounded-lg border-muted-foreground/20",
                activeFiltersCount > 0 && "bg-primary/10 border-primary/30"
              )}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className={cn(
                "size-4",
                activeFiltersCount > 0 ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-sm font-medium">Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center size-5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          )}

          {/* Desktop: filtres inline */}
          {filters && (
            <div className="hidden md:flex md:items-center md:gap-2 md:shrink-0">
              {filters}
            </div>
          )}
        </div>

        {/* Mobile: Sheet pour les filtres */}
        {filters && (
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 h-[70%]">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="size-5" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="flex items-center justify-center size-5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4">
                {filters}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="rounded-md border relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id}>{column.header}</TableHead>
                ))}
                {actions && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    Aucun résultat trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => {
                  if (!row || !row.id) {
                    return null;
                  }
                  return (
                    <TableRow 
                      key={row.id}
                      ref={(el) => {
                        if (el && rowRefs) {
                          rowRefs.current.set(row.id, el);
                        }
                      }}
                    >
                      {columns.map((column) => {
                        let content: React.ReactNode = null;
                        
                        if (column.cell && row) {
                          // Traiter column.cell comme un composant React qui prend { row } comme props
                          const CellComponent = column.cell as React.ComponentType<{ row: T }>;
                          content = <CellComponent row={row} />;
                        } else if (column.accessorKey && row) {
                          // Accéder à la valeur de manière plus robuste
                          const accessor = column.accessorKey;
                          const value = accessor ? (row as any)[accessor] : undefined;
                          
                          if (value != null && value !== "" && value !== undefined) {
                            content = String(value);
                          } else {
                            content = <span className="text-muted-foreground">-</span>;
                          }
                        }
                        
                        // Si content est null ou vide, afficher "-"
                        if (content === null || content === "") {
                          content = <span className="text-muted-foreground">-</span>;
                        }
                        
                        return (
                          <TableCell key={column.id}>
                            {content}
                          </TableCell>
                        );
                      })}
                      {actions && row && row.id ? (
                        <TableCell>
                          {(() => {
                            // Traiter actions comme un composant React qui prend { row } comme props
                            const ActionsComponent = actions as React.ComponentType<{ row: T }>;
                            return <ActionsComponent row={row} />;
                          })()}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Compteur de résultats - caché sur mobile, visible sur desktop */}
        <div className="hidden sm:block text-sm text-muted-foreground">
          {total > 0
            ? `Affichage de ${(page - 1) * pageSize + 1} à ${Math.min(page * pageSize, total)} sur ${total} résultats`
            : "Aucun résultat"}
        </div>
        
        {/* Mobile: compteur simplifié */}
        <div className="sm:hidden text-xs text-muted-foreground text-center">
          {total > 0 ? `${total} résultat${total > 1 ? "s" : ""}` : "Aucun résultat"}
        </div>

        {/* Contrôles de pagination */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Sélecteur de taille de page - caché sur mobile */}
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="hidden sm:flex w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Navigation pages */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-xs sm:text-sm px-2 min-w-[80px] text-center">
              {page} / {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


