import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import "@/lib/zod/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
