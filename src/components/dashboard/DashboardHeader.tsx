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
    <div className="space-y-6 pb-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="h-1 w-8 bg-white/40 rounded-full" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Overview</span>
          </div>
          <h1 className="text-4xl font-serif text-white flex items-center gap-2">
            Olá, {userName?.split(" ")[0]} 
            <Sparkles className="h-5 w-5 text-white/30" />
          </h1>
          <p className="text-white/70 flex items-center gap-1.5 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            {groupName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-inner h-11">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={onPrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-4 text-sm font-bold min-w-[150px] text-center capitalize text-white">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 transition-colors" onClick={onNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <Button className="h-11 gap-2 bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/10 font-bold px-6" asChild>
            <Link to="/expenses">
              <Plus className="h-5 w-5" /> Nova Despesa
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1.5 font-semibold py-1.5 px-4 text-[10px] bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <CalendarClock className="h-3.5 w-3.5 opacity-70" /> 
            Ciclo: {format(cycleStart, "dd/MM")} a {format(subDays(cycleEnd, 1), "dd/MM")}
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-semibold py-1.5 px-4 text-[10px] bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <Calendar className="h-3.5 w-3.5 opacity-70" /> 
            Pagar até: {format(cycleLimitDate, "dd/MM")}
        </Badge>
      </div>
    </div>
  );
}