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
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useMemo } from "react";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => handleSearch("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>

      <div className="rounded-md border">
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
                  <TableRow key={row.id}>
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

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total > 0
            ? `Affichage de ${(page - 1) * pageSize + 1} à ${Math.min(page * pageSize, total)} sur ${total} résultats`
            : "Aucun résultat"}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-sm px-2">
              Page {page} sur {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
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


