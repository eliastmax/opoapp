import { Flame, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { percent, type Coverage } from "@/lib/training-overview";

export const trainingCard = "rounded-[1.5rem] border bg-card shadow-[0_12px_32px_-26px_#163d70]";

export function ProgressBar({ summary, className }: { summary: Coverage; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-2 overflow-hidden rounded-full bg-[#92929b]/30", className)}
    >
      {summary.total > 0 && (
        <>
          <span
            className="bg-[#279d79]"
            style={{ width: `${(summary.mastered / summary.total) * 100}%` }}
          />
          <span
            className="bg-[#468bd3]"
            style={{ width: `${((summary.worked - summary.mastered) / summary.total) * 100}%` }}
          />
        </>
      )}
    </span>
  );
}

export function CoverageRings({ summary }: { summary: Coverage }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-[108px] w-[108px] shrink-0 min-[390px]:h-[120px] min-[390px]:w-[120px]"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="52" fill="var(--background)" />
      {[
        { radius: 49, count: summary.worked, color: "#468bd3" },
        { radius: 35, count: summary.mastered, color: "#279d79" },
      ].map(({ radius, count, color }) => (
        <g key={radius}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#92929b"
            strokeOpacity=".24"
            strokeWidth="9"
          />
          {count > 0 && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="9"
              pathLength="100"
              strokeLinecap="round"
              strokeDasharray={`${(count / summary.total) * 100} 100`}
              transform="rotate(-90 60 60)"
            />
          )}
        </g>
      ))}
      <path
        d="M49 66l7-7 6 4 9-10m-7 0h7v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  );
}

export function CoverageFigures({ summary }: { summary: Coverage }) {
  return (
    <dl className="min-w-0 space-y-2.5">
      <CoverageFigure
        color="bg-[#468bd3]"
        label="Temario trabajado"
        count={summary.worked}
        total={summary.total}
      />
      <CoverageFigure
        color="bg-[#279d79]"
        label="Temario dominado"
        count={summary.mastered}
        total={summary.total}
      />
    </dl>
  );
}

function CoverageFigure({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  const value = percent(count, total);
  return (
    <div className="grid grid-cols-[0.5rem_1fr] items-baseline gap-x-2">
      <dt className="col-start-2 row-start-2 mt-1 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="col-span-2 col-start-1 row-start-1 flex items-center gap-2 text-2xl leading-none font-bold tracking-tight tabular-nums">
        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", color)} />
        {value === null ? "—" : `${value}%`}
      </dd>
    </div>
  );
}

export function Streak({ days }: { days: number }) {
  return (
    <div
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 text-xs font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      title="Racha de días con al menos un test completado"
    >
      <Flame className="size-4" aria-hidden="true" /> {days} {days === 1 ? "día" : "días"} de racha
    </div>
  );
}

export function TrainingError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      className={cn(trainingCard, "flex flex-wrap items-center justify-between gap-2 p-4")}
      role="alert"
    >
      <p className="text-sm font-semibold">{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RotateCw aria-hidden="true" /> Reintentar
      </Button>
    </div>
  );
}
