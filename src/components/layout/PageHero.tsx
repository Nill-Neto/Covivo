import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "warning";
}

const toneStyles: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  default: "border-border bg-gradient-to-br from-card via-card/95 to-muted/70",
  primary: "border-primary/25 bg-gradient-to-br from-primary/25 via-primary/10 to-card",
  warning: "border-warning/35 bg-gradient-to-br from-warning/25 via-warning/10 to-card",
};

const toneAccentClass: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  default: "bg-border",
  primary: "bg-primary",
  warning: "bg-warning",
};

const toneHaloClass: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  default: "bg-muted/70",
  primary: "bg-primary/30",
  warning: "bg-warning/35",
};

export function PageHero({
  title,
  subtitle,
  actions,
  badge,
  icon,
  tone = "default",
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/40 sm:p-7",
        toneStyles[tone]
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-2", toneAccentClass[tone])} aria-hidden="true" />
      <div
        className={cn("pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl", toneHaloClass[tone])}
        aria-hidden="true"
      />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          {(badge || icon) && (
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              {icon ? <span className="shrink-0 rounded-md border bg-background/80 p-1.5">{icon}</span> : null}
              {badge}
            </div>
          )}

          <h1 className="text-3xl font-serif tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}
