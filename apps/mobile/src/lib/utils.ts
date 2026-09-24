import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names; later Tailwind classes win over earlier ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
