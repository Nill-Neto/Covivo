import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthNavigatorProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  className?: string;
}

export function MonthNavigator({
  currentDate,
  onPrevMonth,
  onNextMonth,
  className,
}: MonthNavigatorProps) {
  return (
    <div className={`flex h-10 w-full items-center justify-between rounded-lg border bg-card p-1 shadow-sm sm:w-auto ${className}`}>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onPrevMonth} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 px-2 text-center text-sm font-medium capitalize truncate sm:min-w-[140px]">
        {format(currentDate, "MMMM yyyy", { locale: ptBR })}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onNextMonth} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}