import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

const WEEK_DAYS = 7;

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

/** Head-only count queries: no rows are transferred, only the total. */
const loadCounts = async () => {
  const supabase = await createClient();
  const count = { count: "exact", head: true } as const;
  const [athletes, scorers, recentSessions, inProgress] = await Promise.all([
    supabase.from("athletes").select("id", count).eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", count)
      .eq("role", "scorer")
      .eq("is_active", true),
    supabase
      .from("sessions")
      .select("id", count)
      .gte("session_date", isoDaysAgo(WEEK_DAYS)),
    supabase.from("sessions").select("id", count).eq("status", "in_progress"),
  ]);
  return [
    { label: "Active athletes", value: athletes.count },
    { label: "Active scorers", value: scorers.count },
    { label: "Sessions, last 7 days", value: recentSessions.count },
    { label: "Sessions in progress", value: inProgress.count },
  ];
};

const StatCards = async () => {
  // Env is inlined at build time, so an unconfigured build renders nothing
  // here rather than failing to prerender.
  if (!supabaseEnv) {
    return null;
  }
  // "Last 7 days" depends on today, so this renders per request, never
  // at build time.
  await connection();
  const stats = await loadCounts();
  return (
    <>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardTitle>{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {stat.value ?? "—"}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

const StatCardsSkeleton = () => (
  <>
    {["a", "b", "c", "d"].map((key) => (
      <Skeleton className="h-28" key={key} />
    ))}
  </>
);

const DashboardPage = () => (
  <div>
    <PageHeader
      description="Performance tables, filters, comparisons and exports arrive in the next phase."
      title="Dashboard"
    />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCards />
      </Suspense>
    </div>
  </div>
);

export default DashboardPage;
