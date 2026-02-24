import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, TrendingUp, DollarSign, Loader2, ListChecks, User, Users, Calendar, CreditCard, Plus, CalendarClock, Info, AlertCircle, ChevronLeft, ChevronRight, Package, PieChart as PieIcon, BarChart3 } from "lucide-react";
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

  // Initialize currentDate (The "Competence Month")
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

  // 1. All Expenses in Cycle (for Republic & Personal charts)
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

  // 3. Bill Installments (Credit Cards)
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

  // Pending Splits Logic
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-serif">Olá, {profile?.full_name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1">{membership?.group_name}</p>
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-2 text-sm font-medium min-w-[140px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {groupSettings && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 font-normal py-1 px-3 text-sm">
              <CalendarClock className="h-3.5 w-3.5 text-primary" /> 
              Competência: <strong>{format(cycleStart, "dd/MM")}</strong> a <strong>{format(subDays(cycleEnd, 1), "dd/MM")}</strong>
          </Badge>
          <Badge variant="outline" className="gap-1.5 font-normal py-1 px-3 text-sm">
              <Calendar className="h-3.5 w-3.5 text-destructive" /> 
              Pagar até: <strong>{format(cycleLimitDate, "dd/MM")}</strong>
          </Badge>
        </div>
      )}

      <Tabs defaultValue="republic" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50">
          <TabsTrigger value="republic" className="gap-2 px-4 py-2">
            <Users className="h-4 w-4" /> República
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2 px-4 py-2">
            <User className="h-4 w-4" /> Pessoal
          </TabsTrigger>
          <TabsTrigger value="cards" className="gap-2 px-4 py-2">
            <CreditCard className="h-4 w-4" /> Cartões
          </TabsTrigger>
        </TabsList>

        {/* --- ABA REPÚBLICA --- */}
        <TabsContent value="republic" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className={`relative overflow-hidden transition-all ${isLate && totalCollectivePending > 0 ? "border-destructive bg-destructive/5" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Rateio a Pagar</CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">R$ {totalCollectivePending.toFixed(2)}</div>
                {isLate && totalCollectivePending > 0 && <p className="text-xs text-destructive font-bold mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Atrasado</p>}
                {totalCollectivePending > 0 && (
                  <Button size="sm" className="mt-3 w-full bg-destructive hover:bg-destructive/90" onClick={() => setPayRateioOpen(true)}>
                    Pagar Agora
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total da República</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">R$ {totalMonthExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gastos coletivos no ciclo</p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Por Categoria</CardTitle></CardHeader>
              <CardContent className="h-[120px]">
                {republicChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={republicChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2}>
                        {republicChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Despesas Coletivas Recentes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {collectiveExpenses.slice(0, 5).map(e => (
                  <div key={e.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(e.purchase_date), "dd/MM")}</p>
                    </div>
                    <span className="font-bold">R$ {Number(e.amount).toFixed(2)}</span>
                  </div>
                ))}
                {collectiveExpenses.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa coletiva.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA PESSOAL --- */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-warning-foreground">Pendências Individuais</CardTitle>
                <AlertCircle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif text-warning-foreground">R$ {totalIndividualPending.toFixed(2)}</div>
                {individualPending.length > 0 && (
                  <Button variant="outline" size="sm" className="mt-3 w-full border-warning/50 text-warning-foreground hover:bg-warning/20" onClick={() => setPayIndividualOpen(true)}>
                    Ver Detalhes
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gastos à Vista (Ciclo)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-serif">R$ {totalPersonalCash.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Débito, Dinheiro ou Pix</p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Meus Gastos</CardTitle></CardHeader>
              <CardContent className="h-[120px]">
                {personalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={personalChartData} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Despesas Individuais Recentes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myPersonalExpenses.slice(0, 5).map(e => (
                  <div key={e.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(e.purchase_date), "dd/MM")} • {e.payment_method === 'credit_card' ? 'Cartão' : 'À vista'}</p>
                    </div>
                    <span className="font-bold">R$ {Number(e.amount).toFixed(2)}</span>
                  </div>
                ))}
                {myPersonalExpenses.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa pessoal.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA CARTÕES --- */}
        <TabsContent value="cards" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">Fatura Atual ({format(currentDate, "MMM")})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-serif">R$ {totalBill.toFixed(2)}</div>
                <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
                  <Link to="/personal/bills">Ver Extrato Completo</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Composição da Fatura</CardTitle></CardHeader>
              <CardContent className="h-[160px]">
                {cardsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cardsChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2}>
                        {cardsChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Fatura zerada</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Lançamentos na Fatura</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billInstallments.slice(0, 5).map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium truncate">{i.expenses?.title}</p>
                      <p className="text-xs text-muted-foreground">{i.expenses?.category}</p>
                    </div>
                    <span className="font-bold whitespace-nowrap">R$ {Number(i.amount).toFixed(2)}</span>
                  </div>
                ))}
                {billInstallments.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>}
              </div>
            </CardContent>
          </Card>
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