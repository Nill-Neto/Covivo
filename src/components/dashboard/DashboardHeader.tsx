import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-3xl hero-gradient p-8 md:p-12 mb-8 shadow-2xl shadow-primary/20">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
             <Badge className="bg-primary/20 text-primary-foreground border-primary/30 hover:bg-primary/30 transition-colors">
               <TrendingUp className="h-3 w-3 mr-1" />
               STATUS ATIVO
             </Badge>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Financeiro</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-serif text-white flex items-center gap-3">
            Olá, {userName?.split(" ")[0]} 
            <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
          </h1>
          
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <p className="text-white/70 text-lg font-medium">
              {groupName}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Seletor de Meses Estilizado */}
          <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-inner">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-white hover:bg-white/20 hover:text-white transition-all" 
              onClick={onPrevMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-6 text-base font-bold min-w-[160px] text-center capitalize text-white">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-white hover:bg-white/20 hover:text-white transition-all" 
              onClick={onNextMonth}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            className="h-12 gap-2 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-black/20 border-t border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
            asChild
          >
            <Link to="/expenses">
              <Plus className="h-5 w-5" /> Nova Despesa
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-xl">
            <CalendarClock className="h-4 w-4 text-primary" /> 
            <span className="text-xs text-white/60">Ciclo:</span>
            <strong className="text-xs text-white">{format(cycleStart, "dd/MM")} a {format(subDays(cycleEnd, 1), "dd/MM")}</strong>
        </div>
        <div className="flex items-center gap-2 bg-destructive/10 backdrop-blur-sm border border-destructive/20 px-4 py-2 rounded-xl">
            <Calendar className="h-4 w-4 text-destructive-foreground" /> 
            <span className="text-xs text-white/60">Vencimento:</span>
            <strong className="text-xs text-white">{format(cycleLimitDate, "dd/MM")}</strong>
        </div>
      </div>
    </div>
  );
}