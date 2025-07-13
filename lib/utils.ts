import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const bcFormatter = Intl.NumberFormat("en", {
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
