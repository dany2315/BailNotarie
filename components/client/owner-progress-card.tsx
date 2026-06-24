"use client";

import Link from "next/link";
import { AlertCircle, ClipboardList, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type OwnerProgressCardProps = {
  propertyLabel: string | null;
  tenantName?: string | null;
  bailTypeLabel?: string | null;
  message: string;
  continueHref: string;
  continueLabel?: string;
  onDelete?: () => void;
  deleting?: boolean;
};

export function OwnerProgressCard({
  propertyLabel,
  tenantName,
  bailTypeLabel,
  message,
  continueHref,
  continueLabel = "Continuer ma demande",
  onDelete,
  deleting = false,
}: OwnerProgressCardProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/40 transition-all hover:shadow-md dark:border-amber-800 dark:bg-amber-950/20">
      <CardContent className="p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 shrink-0 rounded-full bg-amber-100 p-1.5 dark:bg-amber-900 sm:p-2">
            <ClipboardList className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-amber-900 dark:text-amber-200 sm:text-base">
              Demande de bail en cours
            </p>
            {propertyLabel ? (
              <p className="mt-0.5 truncate text-xs text-amber-700 dark:text-amber-400">
                {propertyLabel}
              </p>
            ) : (
              <p className="mt-0.5 text-xs italic text-amber-600/70 dark:text-amber-500">
                Bien non renseigné
              </p>
            )}
            {tenantName && (
              <div className="mt-0.5 flex items-center gap-1">
                <User className="h-3 w-3 shrink-0 text-amber-600/70 dark:text-amber-500" />
                <p className="truncate text-[11px] text-amber-600/80 dark:text-amber-500">
                  {tenantName}
                </p>
              </div>
            )}
            {bailTypeLabel && (
              <p className="mt-0.5 text-[11px] text-amber-600/80 dark:text-amber-500">
                {bailTypeLabel}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100/60 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-snug">{message}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
          >
            <Link href={continueHref}>{continueLabel}</Link>
          </Button>
          {onDelete && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={deleting}
              className="h-8 px-2 text-amber-700 hover:text-destructive dark:text-amber-400"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Supprimer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
