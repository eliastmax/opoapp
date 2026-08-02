import { AlertCircle, BookMarked, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import type { ActiveOppositionViewState } from "@/lib/active-opposition";
import { cn } from "@/lib/utils";

type ActiveOppositionContextProps = {
  variant?: "compact" | "settings";
  className?: string;
};

export function ActiveOppositionContext({
  variant = "compact",
  className,
}: ActiveOppositionContextProps) {
  const query = useActiveOpposition();
  const state: ActiveOppositionViewState = query.isLoading
    ? { status: "loading" }
    : query.isError
      ? { status: "error" }
      : query.data
        ? { status: "active", opposition: query.data }
        : { status: "empty" };

  return (
    <ActiveOppositionDisplay
      state={state}
      variant={variant}
      className={className}
      onRetry={() => void query.refetch()}
    />
  );
}

type ActiveOppositionDisplayProps = ActiveOppositionContextProps & {
  state: ActiveOppositionViewState;
  onRetry?: () => void;
};

export function ActiveOppositionDisplay({
  state,
  variant = "compact",
  className,
  onRetry,
}: ActiveOppositionDisplayProps) {
  if (variant === "compact") {
    if (state.status === "loading") {
      return <Skeleton className={cn("mt-3 h-7 w-64 max-w-full rounded-full", className)} />;
    }

    if (state.status === "error") {
      return (
        <div
          role="status"
          className={cn(
            "mt-3 flex max-w-full items-center gap-2 text-xs text-muted-foreground",
            className,
          )}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">No pudimos cargar tu oposición</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 font-semibold text-primary underline-offset-2 hover:underline"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      );
    }

    if (state.status === "empty") {
      return (
        <div
          className={cn(
            "mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground",
            className,
          )}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Aún no hay una oposición activa</span>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs text-foreground ring-1 ring-primary/10",
          className,
        )}
        title={state.opposition.name}
      >
        <BookMarked className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="shrink-0 font-medium text-muted-foreground">Preparando</span>
        <span className="truncate font-semibold">{state.opposition.name}</span>
      </div>
    );
  }

  return (
    <Card className={cn("p-4", className)} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          {state.status === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : state.status === "error" || state.status === "empty" ? (
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          ) : (
            <BookMarked className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preparación actual
          </div>
          {state.status === "loading" ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          ) : state.status === "error" ? (
            <div className="mt-1.5">
              <p className="text-sm font-semibold">No hemos podido cargar tu oposición</p>
              {onRetry ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 -ml-3"
                  onClick={onRetry}
                >
                  <RotateCw className="h-3.5 w-3.5" /> Reintentar
                </Button>
              ) : null}
            </div>
          ) : state.status === "empty" ? (
            <div className="mt-1.5">
              <p className="text-sm font-semibold">Todavía no tienes una oposición activa</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                La selección se habilitará cuando esté disponible el perfil de preparación.
              </p>
            </div>
          ) : (
            <div className="mt-1.5">
              <p
                className="line-clamp-2 text-sm font-semibold leading-snug"
                title={state.opposition.name}
              >
                {state.opposition.name}
              </p>
              {state.opposition.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {state.opposition.description}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
