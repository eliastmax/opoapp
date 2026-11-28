import { CalendarDays } from "lucide-react";
import { trainingCard } from "@/components/training-visuals";
import { cn } from "@/lib/utils";
import type { trainingActivity } from "@/lib/training-overview";

const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const fullDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function WeeklyTestsFirstRecap({ data }: { data: ReturnType<typeof trainingActivity> }) {
  return (
    <section
      className={cn(trainingCard, "p-4")}
      aria-labelledby="weekly-title"
      data-testid="weekly-tests-first-recap"
    >
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-primary" aria-hidden="true" />
        <h2 id="weekly-title" className="font-bold">
          Últimos 7 días
        </h2>
      </div>
      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Tests completados por día">
        {data.days.map(({ date, count }, i) => (
          <li
            key={date.toISOString()}
            className="min-w-0 text-center"
            aria-current={i === 6 ? "date" : undefined}
          >
            <span className="sr-only">
              {fullDate.format(date)}, {count} {count === 1 ? "test" : "tests"}
            </span>
            <div
              aria-hidden="true"
              className={cn(
                "grid h-8 place-items-center rounded-lg text-xs font-bold tabular-nums",
                count > 0 ? "bg-[#163d70] text-white" : "bg-muted text-muted-foreground",
                i === 6 && "ring-1 ring-[#468bd3]",
              )}
            >
              {count || "·"}
            </div>
            <div aria-hidden="true" className="mt-1 text-xs capitalize text-muted-foreground">
              {weekday.format(date).replace(".", "")}
            </div>
          </li>
        ))}
      </ol>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3">
        <div>
          <dt className="text-xs text-muted-foreground">Tests</dt>
          <dd className="text-lg font-bold tabular-nums">{data.tests}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Respondidas</dt>
          <dd className="text-lg font-bold tabular-nums">{data.answered}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Aciertos</dt>
          <dd className="text-lg font-bold tabular-nums">
            {data.correct}
            {data.accuracy !== null && (
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                ({data.accuracy}%)
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
