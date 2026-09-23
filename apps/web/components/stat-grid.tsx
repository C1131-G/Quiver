import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export interface Stat {
  label: string;
  value: string;
}

/** A row of headline numbers above a table. */
export const StatGrid = ({ stats }: { stats: Stat[] | null }) => {
  if (!stats) {
    return (
      <div aria-busy="true" className="mb-6 grid grid-cols-5 gap-4">
        {["a", "b", "c", "d", "e"].map((key) => (
          <Skeleton className="h-20" key={key} />
        ))}
      </div>
    );
  }
  return (
    <div className="mb-6 grid grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
