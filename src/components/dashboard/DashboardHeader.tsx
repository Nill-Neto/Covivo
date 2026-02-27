import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  userName: string | undefined;
  groupName: string | undefined;
  currentDate: Date;
  cycleStart: Date;
  cycleEnd: Date;
  cycleLimitDate: Date;
  onNextMonth: () => void;
  onPrevMonth: () => void;
}

export function DashboardHeader({
  userName,
  groupName,
  currentDate,
  cycleStart,
  cycleEnd,
  cycleLimitDate,
  onNextMonth,
  onPrevMonth,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 p-6 rounded-2xl border border-primary/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif text-foreground">Olá, {userName?.split(" ")[0]}</h1>
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {groupName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center bg-card border border-primary/20 rounded-xl p-1 shadow-sm h-11">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 text-primary" onClick={onPrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-4 text-sm font-bold min-w-[150px] text-center capitalize text-primary">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 text-primary" onClick={onNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <Button className="relative h-11 gap-2 overflow-hidden px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/90" asChild>
            <Link to="/expenses">
              <Plus className="h-5 w-5" /> Nova Despesa
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-2 font-semibold py-1.5 px-4 text-sm border-primary/20 bg-primary/5 text-primary rounded-lg">
            <CalendarClock className="h-4 w-4" /> 
            Competência: <span className="text-foreground ml-1">{format(cycleStart, "dd/MM")} a {format(subDays(cycleEnd, 1), "dd/MM")}</span>
        </Badge>
        <Badge variant="outline" className="gap-2 font-semibold py-1.5 px-4 text-sm border-destructive/20 bg-destructive/5 text-destructive rounded-lg">
            <Calendar className="h-4 w-4" /> 
            Pagar até: <span className="text-foreground ml-1">{format(cycleLimitDate, "dd/MM")}</span>
        </Badge>
      </div>
    </div>
  );
}