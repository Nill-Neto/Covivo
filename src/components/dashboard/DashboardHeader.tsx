import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4 fill-primary/20" />
            <span className="text-xs font-bold uppercase tracking-wider">Visão Geral</span>
          </div>
          <h1 className="text-4xl font-serif text-foreground tracking-tight">
            Olá, <span className="text-primary">{userName?.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            {groupName} 
            <span className="h-1 w-1 rounded-full bg-border" /> 
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center bg-card/50 backdrop-blur border rounded-lg p-1 shadow-sm h-10 ring-1 ring-primary/5">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={onPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 text-sm font-bold min-w-[140px] text-center capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={onNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button className="relative h-10 gap-2 overflow-hidden shadow-lg shadow-primary/20 group" asChild>
            <Link to="/expenses">
              <motion.div
                className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <Plus className="h-4 w-4 relative z-10" /> 
              <span className="relative z-10">Nova Despesa</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1.5 font-semibold py-1.5 px-4 text-sm bg-primary/5 border-primary/20 text-primary">
            <CalendarClock className="h-3.5 w-3.5" /> 
            Ciclo: <strong>{format(cycleStart, "dd/MM")}</strong> a <strong>{format(subDays(cycleEnd, 1), "dd/MM")}</strong>
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-semibold py-1.5 px-4 text-sm bg-destructive/5 border-destructive/20 text-destructive">
            <Calendar className="h-3.5 w-3.5" /> 
            Vencimento: <strong>{format(cycleLimitDate, "dd/MM")}</strong>
        </Badge>
      </div>
      
      <div className="h-px w-full bg-gradient-to-r from-primary/20 via-transparent to-transparent" />
    </div>
  );
}