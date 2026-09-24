"use client";

import { catchError } from "next/error";
import type { ErrorInfo } from "next/error";

import { ErrorPanel } from "@/components/error-panel";

const SectionErrorFallback = (
  { title }: { title: string },
  { retry }: ErrorInfo
) => <ErrorPanel onRetry={retry} title={title} />;

/**
 * Catches a render error in one section so the rest of the page and the
 * shell stay usable. Built on catchError, so notFound() and redirect() still
 * reach Next.js instead of being swallowed here.
 */
export const SectionErrorBoundary = catchError(SectionErrorFallback);
