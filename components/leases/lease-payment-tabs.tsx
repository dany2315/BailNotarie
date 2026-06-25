"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

type PaymentFilter = "all" | "unpaid" | "paid";

interface LeasePaymentTabsProps {
  counts: {
    total: number;
    unpaid: number;
    paid: number;
  };
}

const tabs: Array<{ value: PaymentFilter; label: string; countKey: keyof LeasePaymentTabsProps["counts"] }> = [
  { value: "all", label: "Tous", countKey: "total" },
  { value: "unpaid", label: "Demandes non payées", countKey: "unpaid" },
  { value: "paid", label: "Baux payés", countKey: "paid" },
];

export function LeasePaymentTabs({ counts }: LeasePaymentTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPayment = (searchParams.get("payment") as PaymentFilter | null) || "all";

  const handleChange = (payment: PaymentFilter) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      if (payment === "all") {
        params.delete("payment");
      } else {
        params.set("payment", payment);
      }

      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = currentPayment === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleChange(tab.value)}
            disabled={isPending}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-60",
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
              {counts[tab.countKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
