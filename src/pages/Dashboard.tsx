import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, TrendingUp, DollarSign, Loader2, ListChecks, User, Users, Calendar, CreditCard, Plus, CalendarClock, Info, AlertCircle, ChevronLeft, ChevronRight, Package, PieChart as PieIcon, BarChart3, Wallet, ArrowRight } from "lucide-react";
import { format, subDays, isAfter, isSameDay, addMonths, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from "recharts";

const CHART_COLORS = ["#0f172a", "#0d9488", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export default function Dashboard() {
  const { profile, membership, user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  
  // Payment State
  const [payRateioOpen, setPayRateioOpen] = useState(false);
  const [payIndividualOpen, setPayIndividualOpen] = useState(false);
  const [selectedIndividualSplit, setSelectedIndividualSplit] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Group Settings & Initial Date Logic ---
  const { data: groupSettings } = useQuery({
    queryKey: ["group-settings-dashboard", membership?.group_id],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("closing_day, due_day").eq("id", membership!.group_id).single();
      return data;
    },
    enabled: !!membership?.group_id
  });

  const closingDay = groupSettings?.closing_day || 1;
  const dueDay = groupSettings?.due_day || 10;

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (groupSettings) {
      const today = new Date();
      if (today.getDate() >= groupSettings.closing_day) {
        setCurrentDate(addMonths(today, 1));
      } else {
        setCurrentDate(today);
      }
    }
  }, [groupSettings]);

  const cycleStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, closingDay);
  const cycleEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), closingDay);
  
  const cycleDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
  const cycleLimitDate = subDays(cycleDueDate, 1);
  const isLate = isAfter(now, cycleLimitDate) && !isSameDay(now, cycleLimitDate);

  // --- Queries ---

  // 1. All Expenses in Cycle
  const { data: expensesInCycle = [] } = useQuery({
    queryKey: ["expenses-dashboard", membership?.group_id, cycleStart.toISOString(), cycleEnd.toISOString()],
    queryFn: async () => {
      const dbStart = format(cycleStart, "yyyy-MM-dd");
      const dbEnd = format(cycleEnd, "yyyy-MM-dd");

      const { data } = await supabase
        .from("expenses")
        .select("id, title, amount, category, expense_type, created_by, purchase_date, payment_method")
        .eq("group_id", membership!.group_id)
        .gte("purchase_date", dbStart)
        .lt("purchase_date", dbEnd);
      return data ?? [];
    },
    enabled: !!membership?.group_id
  });

  // 2. Pending Splits
  const { data: pendingSplits = [] } = useQuery({
    queryKey: ["my-pending-splits", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_splits")
        .select("id, amount, status, expense_id, expenses:expense_id(title, group_id, expense_type, created_at, purchase_date)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.expenses?.group_id === membership!.group_id);
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  // 3. User Credit Cards
  const { data: creditCards = [] } = useQuery({
    queryKey: ["my-credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // 4. Bill Installments
  const { data: billInstallments = [] } = useQuery({
    queryKey: ["bill-installments-dashboard", user?.id, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const targetMonth = currentDate.getMonth() + 1; 
      const targetYear = currentDate.getFullYear();

      const { data } = await supabase
        .from("expense_installments" as any)
        .select("amount, expenses(title, category, credit_card_id)")
        .eq("user_id", user!.id)
        .eq("bill_month", targetMonth)
        .eq("bill_year", targetYear);

      return data ?? [];
    },
    enabled: !!user,
  });

  // --- Data Processing ---

  // Republic Data
  const collectiveExpenses = expensesInCycle.filter(e => e.expense_type === "collective");
  const totalMonthExpenses = collectiveExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const republicChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    collectiveExpenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [collectiveExpenses]);

  // Personal Data (In cycle)
  const myPersonalExpenses = expensesInCycle.filter(e => e.created_by === user?.id && e.expense_type === "individual");
  const totalPersonalCash = myPersonalExpenses
    .filter(e => e.payment_method !== "credit_card")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const personalChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    myPersonalExpenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [myPersonalExpenses]);

  // Pending Splits Logic (Filtered by cycle dates)
  const filteredPendingSplits = pendingSplits.filter((s: any) => {
    const dateStr = s.expenses?.purchase_date;
    if (!dateStr) return false;
    const expenseDateStr = dateStr;
    const startStr = format(cycleStart, "yyyy-MM-dd");
    const endStr = format(cycleEnd, "yyyy-MM-dd");
    return expenseDateStr >= startStr && expenseDateStr < endStr;
  });

  const collectivePending = filteredPendingSplits.filter((s: any) => s.expenses?.expense_type === "collective");
  const individualPending = filteredPendingSplits.filter((s: any) => s.expenses?.expense_type === "individual");
  const totalCollectivePending = collectivePending.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const totalIndividualPending = individualPending.reduce((sum: number, s: any) => sum + Number(s.amount), 0);

  // Cards Data
  const totalBill = billInstallments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  
  const cardsBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    creditCards.forEach(c => map[c.id] = 0); // Init
    billInstallments.forEach((i: any) => {
      const cId = i.expenses?.credit_card_id;
      if (cId && map[cId] !== undefined) {
        map[cId] += Number(i.amount);
      }
    });
    return map;
  }, [creditCards, billInstallments]);

  const cardsChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    billInstallments.forEach((i: any) => {
      const cat = i.expenses?.category || "Outros";
      categories[cat] = (categories[cat] || 0) + Number(i.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [billInstallments]);


  // --- Handlers ---
  const handlePayRateio = async () => {
    if (!receiptFile) return;
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_rateio.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      await supabase.from("payments").insert({
        group_id: membership!.group_id,
        expense_split_id: null,
        paid_by: user!.id,
        amount: totalCollectivePending,
        receipt_url: urlData.publicUrl,
        notes: `Pagamento de Rateio - ${format(currentDate, "MMMM/yyyy", { locale: ptBR })}`
      });

      toast({ title: "Pagamento enviado!" });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits"] });
      setPayRateioOpen(false);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePayIndividual = async () => {
    if (!receiptFile || !selectedIndividualSplit) return;
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_indiv.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      await supabase.from("payments").insert({
        group_id: membership!.group_id,
        expense_split_id: selectedIndividualSplit.id,
        paid_by: user!.id,
        amount: Number(selectedIndividualSplit.amount),
        receipt_url: urlData.publicUrl,
        notes: `Pagamento individual: ${selectedIndividualSplit.expenses?.title}`
      });

      toast({ title: "Pagamento individual enviado!" });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits"] });
      setPayIndividualOpen(false);
      setSelectedIndividualSplit(null);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Acompanhe as finanças da {membership?.group_name}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center bg-card border rounded-lg p-1 shadow-sm h-10">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm font-medium min-w-[140px] text-center capitalize">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" className="h-10 gap-2" asChild>
            <Link to="/expenses"><Plus className="h-4 w-4" /> Nova Despesa</Link>
          </Button>
        </div>
      </div>

      {/* Info Badges */}
      {groupSettings && (
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card text-xs text-muted-foreground shadow-sm">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            <span>Competência: <strong>{format(cycleStart, "dd/MM")}</strong> a <strong>{format(subDays(cycleEnd, 1), "dd/MM")}</strong></span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card text-xs text-muted-foreground shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-destructive" />
            <span>Vencimento do Rateio: <strong>{format(cycleLimitDate, "dd/MM")}</strong></span>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="republic" className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="republic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
            <Users className="h-4 w-4 mr-2" /> República
          </TabsTrigger>
          <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
            <User className="h-4 w-4 mr-2" /> Pessoal
          </TabsTrigger>
          <TabsTrigger value="cards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">
            <CreditCard className="h-4 w-4 mr-2" /> Cartões
          </TabsTrigger>
        </TabsList>

        {/* ================= ABA REPÚBLICA ================= */}
        <TabsContent value="republic" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* KPI Cards */}
            <Card className={`col-span-1 lg:col-span-2 relative overflow-hidden ${isLate && totalCollectivePending > 0 ? "border-destructive bg-destructive/5" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Meu Rateio (Pendente)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-serif text-foreground">R$ {totalCollectivePending.toFixed(2)}</div>
                {isLate && totalCollectivePending > 0 && (
                  <p className="text-xs text-destructive font-bold mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3"/> Pagamento em Atraso
                  </p>
                )}
                {totalCollectivePending > 0 && (
                  <Button className="mt-4 w-full sm:w-auto" variant={isLate ? "destructive" : "default"} onClick={() => setPayRateioOpen(true)}>
                    Realizar Pagamento
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total da Casa</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">R$ {totalMonthExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Soma de todas despesas coletivas</p>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Crítico</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">--</div>
                <Button variant="link" className="h-auto p-0 text-xs text-primary mt-1" asChild>
                  <Link to="/inventory">Ver estoque →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            {/* Chart */}
            <Card className="md:col-span-4 lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                {republicChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={republicChartData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={70} 
                        paddingAngle={3}
                        stroke="none"
                      >
                        {republicChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(v: number) => `R$ ${v.toFixed(2)}`} 
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "11px", marginLeft: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                    <PieIcon className="h-8 w-8 mb-2 opacity-20" />
                    Sem dados no período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* List */}
            <Card className="md:col-span-8 lg:col-span-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Últimas Despesas Coletivas</CardTitle>
                <Link to="/expenses" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-4">
                    {collectiveExpenses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-10">Nenhuma despesa registrada.</p>
                    ) : (
                      collectiveExpenses.slice(0, 10).map(e => (
                        <div key={e.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Receipt className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-none">{e.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {e.category} • {format(new Date(e.purchase_date), "dd MMM")}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold text-sm">R$ {Number(e.amount).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= ABA PESSOAL ================= */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-warning-foreground">Pendências Individuais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif text-warning-foreground">R$ {totalIndividualPending.toFixed(2)}</div>
                {individualPending.length > 0 && (
                  <Button variant="outline" size="sm" className="mt-4 w-full border-warning/50 text-warning-foreground hover:bg-warning/20" onClick={() => setPayIndividualOpen(true)}>
                    Pagar Pendências
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gastos à Vista (Este Ciclo)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">R$ {totalPersonalCash.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Pix, Dinheiro ou Débito</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fatura Atual Estimada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">R$ {totalBill.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Soma de todos os cartões</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-8 lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Meus Gastos Individuais</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-4">
                    {myPersonalExpenses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-10">Nenhuma despesa pessoal.</p>
                    ) : (
                      myPersonalExpenses.slice(0, 10).map(e => (
                        <div key={e.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-medium">{e.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] h-4 px-1">{e.category}</Badge>
                              <span className="text-xs text-muted-foreground">{format(new Date(e.purchase_date), "dd/MM")} • {e.payment_method === 'credit_card' ? 'Cartão' : 'À vista'}</span>
                            </div>
                          </div>
                          <span className="font-semibold text-sm">R$ {Number(e.amount).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="md:col-span-4 lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Categorias</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                {personalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={personalChartData} layout="vertical" margin={{ left: 5, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{fill: 'transparent'}} formatter={(v: number) => `R$ ${v.toFixed(2)}`} contentStyle={{ borderRadius: "8px" }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= ABA CARTÕES ================= */}
        <TabsContent value="cards" className="space-y-6">
          {/* Summary Row */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-primary text-primary-foreground md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">Total em Faturas</CardTitle>
                <Wallet className="h-4 w-4 text-primary-foreground/60" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-serif">R$ {totalBill.toFixed(2)}</div>
                <p className="text-xs text-primary-foreground/60 mt-1">Referente a {format(currentDate, "MMM/yyyy")}</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Composição</CardTitle>
              </CardHeader>
              <CardContent className="h-[100px]">
                {cardsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cardsChartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} interval={0} />
                      <RechartsTooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill="#64748b" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Fatura zerada</div>}
              </CardContent>
            </Card>
          </div>

          {/* Cards Grid */}
          <div>
            <h3 className="text-lg font-serif mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Meus Cartões
            </h3>
            
            {creditCards.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                  <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum cartão cadastrado.</p>
                  <Button variant="outline" asChild><Link to="/personal/cards">Cadastrar Cartão</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {creditCards.map(card => {
                  const billValue = cardsBreakdown[card.id] || 0;
                  const closing = new Date();
                  closing.setDate(card.closing_day);
                  const due = new Date();
                  due.setDate(card.due_day);
                  
                  return (
                    <Card key={card.id} className="flex flex-col justify-between">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{card.label}</CardTitle>
                            <p className="text-xs text-muted-foreground capitalize">{card.brand}</p>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs">Final {card.due_day}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Fatura Atual</p>
                          <p className="text-2xl font-bold font-serif">R$ {billValue.toFixed(2)}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                          <div>
                            <span className="text-muted-foreground block">Fecha dia</span>
                            <span className="font-medium">{card.closing_day}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Vence dia</span>
                            <span className="font-medium">{card.due_day}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Add Card Button */}
                <Link to="/personal/cards" className="flex flex-col items-center justify-center border border-dashed rounded-lg h-full min-h-[180px] hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <Plus className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Novo Cartão</span>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}
      <Dialog open={payRateioOpen} onOpenChange={setPayRateioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Pagar Rateio Coletivo</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total a pagar ({format(currentDate, "MMMM/yy", { locale: ptBR })})</p>
              <p className="text-3xl font-bold font-serif text-primary mt-1">R$ {totalCollectivePending.toFixed(2)}</p>
            </div>
            {collectivePending.length > 0 && (
              <div className="border rounded-md p-3 bg-card">
                 <p className="text-xs font-semibold text-muted-foreground mb-2">Detalhamento:</p>
                 <ScrollArea className="h-[120px] pr-2">
                    <div className="space-y-2">
                      {collectivePending.map((s: any) => (
                        <div key={s.id} className="flex justify-between text-sm border-b pb-1 border-muted last:border-0">
                          <span className="truncate pr-2 flex-1">{s.expenses?.title}</span>
                          <span className="font-medium">R$ {Number(s.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                 </ScrollArea>
              </div>
            )}
            <div className="space-y-2">
              <Label>Comprovante *</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayRateioOpen(false)}>Cancelar</Button>
              <Button onClick={handlePayRateio} disabled={saving || !receiptFile}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enviar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payIndividualOpen} onOpenChange={(v) => { if (!v) { setPayIndividualOpen(false); setSelectedIndividualSplit(null); } else setPayIndividualOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagar Individual</DialogTitle></DialogHeader>
          {!selectedIndividualSplit ? (
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-3">
                {individualPending.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium truncate">{s.expenses?.title}</p>
                      <p className="text-xs text-muted-foreground">R$ {Number(s.amount).toFixed(2)}</p>
                    </div>
                    <Button size="sm" onClick={() => setSelectedIndividualSplit(s)}>Pagar</Button>
                  </div>
                ))}
                {individualPending.length === 0 && <p className="text-center text-muted-foreground py-4">Sem pendências.</p>}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
               <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">{selectedIndividualSplit.expenses?.title}</p>
                  <p className="text-2xl font-bold font-serif text-primary mt-1">R$ {Number(selectedIndividualSplit.amount).toFixed(2)}</p>
               </div>
               <div className="space-y-2">
                  <Label>Comprovante *</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setSelectedIndividualSplit(null)}>Voltar</Button>
                 <Button onClick={handlePayIndividual} disabled={saving || !receiptFile}>Enviar</Button>
               </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}