"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Home } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HomeTab } from "@/components/dashboard/HomeTab";
import { PersonalTab } from "@/components/dashboard/PersonalTab";
import { CardsTab } from "@/components/dashboard/CardsTab";
import { PaymentDialogs, type RateioScope } from "@/components/dashboard/PaymentDialogs";
import { useDashboardData } from "@/hooks/data/useDashboardData";
import { getCompetenceKeyFromDate } from "@/lib/cycleDates";
import { Skeleton } from "@/components/ui/skeleton";

import type { Tables } from "@/integrations/supabase/types";
import { RegisterPaymentModal } from "@/components/expenses/RegisterPaymentModal";

type ExpenseRow = Tables<"expenses"> & {
  expense_splits: Tables<"expense_splits">[];
};

export default function Dashboard() {
  const { profile, membership, user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data, isLoading, cycleManagement } = useDashboardData();
  const { currentDate, setCurrentDate, nextMonth, prevMonth, cycleStart, cycleEnd, cycleLimitDate, closingDay } = cycleManagement;

  const [payRateioOpen, setPayRateioOpen] = useState(false);
  const [payIndividualOpen, setPayIndividualOpen] = useState(false);
  const [selectedIndividualSplit, setSelectedIndividualSplit] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateioScope, setRateioScope] = useState<RateioScope>("previous");
  const [rateioCurrentAmount, setRateioCurrentAmount] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [heroCompact, setHeroCompact] = useState(false);
  const [expenseToPay, setExpenseToPay] = useState<ExpenseRow | null>(null);

  const handlePayRateio = async (scope: RateioScope) => {
    if (!receiptFile || !data) return;
    setSaving(true);
    try {
      const parsedCurrentAmount = Number(rateioCurrentAmount.replace(",", "."));
      const amount = parsedCurrentAmount;

      if (!Number.isFinite(amount) || amount <= 0) {
        toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
        return;
      }
      
      if (scope === "previous" && amount > data.totalCollectivePendingPrevious + 0.01) {
        toast({ title: "Valor inválido", description: `O valor não pode ser maior que o total pendente (R$ ${data.totalCollectivePendingPrevious.toFixed(2)}).`, variant: "destructive" });
        return;
      }

      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_rateio.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      let paymentDate = new Date();
      if (scope === "previous") {
        paymentDate = new Date(cycleStart.getTime() - 12 * 60 * 60 * 1000);
      }

      const compKey = getCompetenceKeyFromDate(paymentDate, closingDay);
      const [y, m] = compKey.split("-").map(Number);

      await (supabase.from("payments") as any).insert({
        group_id: membership!.group_id,
        expense_split_id: null,
        pagador_user_id: user!.id,
        competence_key: data.currentCompetenceKey,
        amount,
        receipt_url: urlData.publicUrl,
        created_at: paymentDate.toISOString(),
        competence_year: y,
        competence_month: m,
        notes: scope === "previous"
          ? `Pagamento de Rateio - competências anteriores`
          : `Pagamento de Rateio - competência atual (${format(currentDate, "MMMM/yyyy", { locale: ptBR })})`
      });

      toast({ title: "Pagamento enviado!" });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-bulk-payments-dashboard"] });
      setPayRateioOpen(false);
      setReceiptFile(null);
      setRateioCurrentAmount("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePayIndividual = async () => {
    if (!receiptFile || !selectedIndividualSplit || !data) return;
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_indiv.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const paymentDate = new Date();
      const compKey = getCompetenceKeyFromDate(paymentDate, closingDay);
      const [y, m] = compKey.split("-").map(Number);

      await (supabase.from("payments") as any).insert({
        group_id: membership!.group_id,
        expense_split_id: selectedIndividualSplit.id,
        pagador_user_id: user!.id,
        competence_key: data.currentCompetenceKey,
        amount: Number(selectedIndividualSplit.amount),
        receipt_url: urlData.publicUrl,
        created_at: paymentDate.toISOString(),
        competence_year: y,
        competence_month: m,
        notes: `Pagamento individual: ${selectedIndividualSplit.expenses?.title}`
      });

      toast({ title: "Pagamento individual enviado!" });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-bulk-payments-dashboard"] });
      setPayIndividualOpen(false);
      setSelectedIndividualSplit(null);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const tabTriggerClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground/60 text-xs font-semibold px-3 py-1.5 rounded-md transition-all";
  const tabListClass = "w-full justify-start overflow-x-auto bg-muted/50 rounded-lg p-1 h-auto gap-1";

  const compactTabsList = (
    <TabsList className={tabListClass}>
      <TabsTrigger value="home" className={tabTriggerClass}>
        <Home className="h-3.5 w-3.5 mr-1.5" /> Início
      </TabsTrigger>
      <TabsTrigger value="personal" className={tabTriggerClass}>
        <User className="h-3.5 w-3.5 mr-1.5" /> Geral
      </TabsTrigger>
      <TabsTrigger value="cards" className={tabTriggerClass}>
        <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Cartões
      </TabsTrigger>
    </TabsList>
  );
  
  if (isLoading || !data) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <DashboardHeader
          userName={profile?.full_name}
          groupName={membership?.group_name}
          currentDate={currentDate}
          cycleStart={cycleStart}
          cycleEnd={cycleEnd}
          cycleLimitDate={cycleLimitDate}
          onNextMonth={nextMonth}
          onPrevMonth={prevMonth}
          onDateSelect={setCurrentDate}
          compactTabs={compactTabsList}
          onCompactChange={setHeroCompact}
        />
        <div className="px-4 space-y-4 md:px-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 animate-in fade-in duration-500">
      <DashboardHeader
        userName={profile?.full_name}
        groupName={membership?.group_name}
        currentDate={currentDate}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
        cycleLimitDate={cycleLimitDate}
        onNextMonth={nextMonth}
        onPrevMonth={prevMonth}
        onDateSelect={setCurrentDate}
        compactTabs={compactTabsList}
        onCompactChange={setHeroCompact}
      />

      <div className="px-4 space-y-4 md:px-6">
        {!heroCompact && (
          <TabsList className={tabListClass}>
            <TabsTrigger value="home" className={tabTriggerClass}>
              <Home className="h-3.5 w-3.5 mr-1.5" /> Início
            </TabsTrigger>
            <TabsTrigger value="personal" className={tabTriggerClass}>
              <User className="h-3.5 w-3.5 mr-1.5" /> Geral
            </TabsTrigger>
            <TabsTrigger value="cards" className={tabTriggerClass}>
              <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Cartões
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="home" className="space-y-6">
          <HomeTab />
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <PersonalTab
            modoGestao={(membership as any)?.group_modo_gestao}
            p2pBalances={data.p2pBalances}
            closingDay={closingDay}
            currentDate={currentDate}
            totalIndividualPending={data.totalIndividualPending}
            totalCollectivePendingPrevious={data.totalCollectivePendingPrevious}
            totalCollectivePendingCurrent={data.totalCollectivePendingCurrent}
            collectivePendingPreviousByCompetence={data.collectivePendingPreviousByCompetence}
            collectivePendingCurrentByCompetence={data.collectivePendingCurrentByCompetence}
            individualPending={data.individualPending}
            totalPersonalCash={data.totalPersonalCash}
            totalBill={data.totalBill}
            totalUserExpensesCompetence={data.totalUserExpensesCompetence}
            totalUserExpensesCurrentBalance={data.totalUserExpensesCurrentBalance}
            myCollectiveShare={data.myCollectiveShare}
            personalChartData={data.personalChartData}
            myPersonalExpenses={data.myPersonalExpenses}
            republicChartData={data.republicChartData}
            totalMonthExpenses={data.totalMonthExpenses}
            onPayRateio={(scope) => {
              setRateioScope(scope);
              if (scope === "current") {
                setRateioCurrentAmount(data.totalCollectivePendingCurrent.toFixed(2));
              } else {
                setRateioCurrentAmount(data.totalCollectivePendingPrevious.toFixed(2));
              }
              setPayRateioOpen(true);
            }}
            onRegisterPayment={setExpenseToPay}
          />
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <CardsTab
            totalBill={data.totalBill}
            currentDate={currentDate}
            cardsChartData={data.cardsChartData}
            creditCards={data.creditCards}
            cardsBreakdown={data.cardsBreakdown}
            billInstallments={data.billInstallments}
            isLoading={isLoading}
          />
        </TabsContent>
      </div>

      <PaymentDialogs
        payRateioOpen={payRateioOpen}
        setPayRateioOpen={setPayRateioOpen}
        payIndividualOpen={payIndividualOpen}
        setPayIndividualOpen={setPayIndividualOpen}
        selectedIndividualSplit={selectedIndividualSplit}
        setSelectedIndividualSplit={setSelectedIndividualSplit}
        collectivePendingByScope={{
          previous: { total: data.totalCollectivePendingPrevious, items: data.displayCollectivePendingPrevious },
          current: { total: data.totalCollectivePendingCurrent, items: data.displayCollectivePendingCurrent },
        }}
        collectivePendingByScopeGrouped={{
          previous: data.collectivePendingPreviousByCompetence,
          current: data.collectivePendingCurrentByCompetence,
        }}
        rateioScope={rateioScope}
        individualPending={data.individualPending}
        currentDate={currentDate}
        onPayRateio={handlePayRateio}
        onPayIndividual={handlePayIndividual}
        saving={saving}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
        rateioCurrentAmount={rateioCurrentAmount}
        setRateioCurrentAmount={setRateioCurrentAmount}
      />

      <RegisterPaymentModal
        open={!!expenseToPay}
        onOpenChange={(isOpen) => {
          if (!isOpen) setExpenseToPay(null);
        }}
        expense={expenseToPay}
        onSuccess={() => setExpenseToPay(null)}
        participantOptions={data.participantOptions}
        cards={data.creditCards}
      />
    </Tabs>
  );
}