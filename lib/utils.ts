import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function localizeUtc(utcDate: number) {
  const date = new Date(utcDate);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  // Adjust the timestamp by the timezone offset to get the correct UTC time
  const adjustedValue = utcDate - timezoneOffsetMs;
  const adjustedDate = new Date(adjustedValue);
  return adjustedDate;
}

export const bcFormatter = Intl.NumberFormat("en", {
  notation: "compact",
  minimumFractionDigits: 2,
});