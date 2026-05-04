
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCycleDates } from "@/hooks/useCycleDates";
import { getCategoryLabel } from "@/constants/categories.tsx";
import { getCompetenceKeyFromDate, formatCompetenceKey } from "@/lib/cycleDates";
import {
  groupPendingByCompetence,
  resolvePendingCompetenceKey,
  sortPendingItemsByDateDesc,
} from "@/lib/collectivePending";

import type { Database, Tables } from "@/integrations/supabase/types";

type MyP2PBalance = Database["public"]["Functions"]["get_my_p2p_balances"]["Returns"][number];

export function useDashboardData() {
  const { profile, membership, user } = useAuth();
  
  const {
    currentDate,
    setCurrentDate,
    cycleStart,
    cycleEnd,
    cycleLimitDate,
    nextMonth,
    prevMonth,
    closingDay,
  } = useCycleDates(membership?.group_id);

  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data: expensesInCycle = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["dashboard-expenses", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_splits (
            user_id,
            amount
          )
        `)
        .eq("group_id", membership!.group_id)
        .eq("competence_key", currentCompetenceKey);
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id,
    staleTime: 60_000,
  });

  const { data: pendingSplits = [], isLoading: isLoadingPendingSplits } = useQuery({
    queryKey: ["my-pending-splits-dashboard", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_splits")
        .select("id, amount, status, expense_id, expenses:expense_id(title, category, group_id, expense_type, created_at, purchase_date, payment_method, credit_card_id, installments, competence_key, credit_cards:credit_card_id(closing_day)), payments(id, status)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.expenses?.group_id === membership!.group_id);
    },
    enabled: !!membership?.group_id && !!user?.id,
    staleTime: 30_000,
  });

  const { data: myBulkPayments = [], isLoading: isLoadingMyBulkPayments } = useQuery({
    queryKey: ["my-bulk-payments-dashboard", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payments") as any)
        .select("id, amount, notes, status")
        .eq("group_id", membership!.group_id)
        .eq("pagador_user_id", user!.id)
        .is("expense_split_id", null)
        .in("status", ["pending", "confirmed"]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  const { data: creditCards = [], isLoading: isLoadingCreditCards } = useQuery({
    queryKey: ["my-credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: participantOptions = [], isLoading: isLoadingParticipantOptions } = useQuery({
    queryKey: ["participant-options", membership?.group_id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_group_member_public_profiles", {
        _group_id: membership!.group_id,
      });
      return (data ?? []).map(p => ({ id: p.id, name: p.full_name }));
    },
    enabled: !!membership?.group_id,
  });

  const { data: billInstallments = [], isLoading: isLoadingBillInstallments } = useQuery({
    queryKey: ["bill-installments-dashboard", user?.id, membership?.group_id, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const targetMonth = currentDate.getMonth() + 1;
      const targetYear = currentDate.getFullYear();

      const [groupRes, personalRes] = await Promise.all([
        supabase
          .from("expense_installments" as any)
          .select("id, amount, installment_number, expenses!inner(title, category, credit_card_id, expense_type, purchase_date, installments, group_id, created_at)")
          .eq("user_id", user!.id)
          .eq("expenses.group_id", membership!.group_id)
          .eq("bill_month", targetMonth)
          .eq("bill_year", targetYear)
          .limit(1000),
        supabase
          .from("personal_expense_installments")
          .select("id, amount, installment_number, personal_expenses(title, credit_card_id, purchase_date, installments, created_at)")
          .eq("user_id", user!.id)
          .eq("bill_month", targetMonth)
          .eq("bill_year", targetYear)
          .limit(1000),
      ]);

      if (groupRes.error) console.error("[Dashboard] group installments error:", groupRes.error);
      if (personalRes.error) console.error("[Dashboard] personal installments error:", personalRes.error);

      const groupItems = (groupRes.data as any[] ?? []);
      const personalItems = (personalRes.data as any[] ?? []).map((p: any) => ({
        ...p,
        expenses: {
          title: p.personal_expenses?.title,
          category: "other",
          credit_card_id: p.personal_expenses?.credit_card_id,
          expense_type: "personal",
          purchase_date: p.personal_expenses?.purchase_date,
          installments: p.personal_expenses?.installments ?? 1,
          created_at: p.personal_expenses?.created_at,
        },
      }));

      return [...groupItems, ...personalItems];
    },
    enabled: !!user && !!membership?.group_id,
    staleTime: 60_000,
  });

  const { data: p2pBalances = [], isLoading: isLoadingP2PBalances } = useQuery<MyP2PBalance[]>({
    queryKey: ["get_my_p2p_balances", user?.id, membership?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_p2p_balances", { _user_id: user!.id });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!membership && (membership as any).group_modo_gestao === 'p2p',
  });

  const isLoading = 
    isLoadingExpenses || 
    isLoadingPendingSplits || 
    isLoadingMyBulkPayments || 
    isLoadingCreditCards || 
    isLoadingParticipantOptions || 
    isLoadingBillInstallments || 
    isLoadingP2PBalances;

  // Memoized calculations
  const processedData = useMemo(() => {
    if (isLoading) {
      return null;
    }

    const collectiveExpenses = expensesInCycle.filter(e => e.expense_type === "collective");
    const totalMonthExpenses = collectiveExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const myCollectiveShare = collectiveExpenses.reduce((sum, e) => {
      const splits = (e.expense_splits as unknown as { user_id: string; amount: number }[]) || [];
      const mySplit = splits.find((s) => s.user_id === user?.id);
      return sum + (mySplit ? Number(mySplit.amount) : 0);
    }, 0);

    const republicChartData = (() => {
      const categories: Record<string, number> = {};
      collectiveExpenses.forEach(e => {
        const label = getCategoryLabel(e.category);
        categories[label] = (categories[label] || 0) + Number(e.amount);
      });
      return Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    })();

    const currentCycleCashIndividualExpenses = expensesInCycle.filter(
      (e) => e.created_by === user?.id && e.expense_type === "individual" && e.payment_method !== "credit_card"
    );

    const currentMonthIndividualInstallments = billInstallments
      .filter((i: any) => i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal")
      .map((i: any) => ({
        id: i.id,
        title: i.expenses?.title,
        category: i.expenses?.category,
        amount: i.amount,
        purchase_date: i.expenses?.purchase_date,
        payment_method: "credit_card",
        expense_type: i.expenses?.expense_type,
        created_by: user?.id,
        installment_number: i.installment_number,
        installments: i.expenses?.installments || 1,
      }));

    const myPersonalExpenses = [
      ...currentCycleCashIndividualExpenses,
      ...currentMonthIndividualInstallments,
    ];
    
    const totalPersonalCash = myPersonalExpenses
      .filter(e => e.payment_method !== "credit_card")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalBill = billInstallments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

    const personalChartData = (() => {
      const categories: Record<string, number> = {};
      myPersonalExpenses.forEach(e => {
        const label = getCategoryLabel(e.category);
        categories[label] = (categories[label] || 0) + Number(e.amount);
      });
      return Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    })();

    const collectivePending = pendingSplits
      .filter((s: any) => {
        if (s.expenses?.expense_type !== "collective") return false;
        const hasPayment = (s.payments || []).some((p: any) => p.status === 'pending' || p.status === 'confirmed');
        return !hasPayment;
      })
      .map((split: any) => {
        const compKey = resolvePendingCompetenceKey({
          competenceKey: split.expenses?.competence_key,
          purchaseDate: split.expenses?.purchase_date,
          closingDay,
          getCompetenceKeyFromDate,
        });
        return {
          ...split,
          competenceKey: compKey,
        };
      });

    const totalBulkPayments = myBulkPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const collectivePendingCurrent = collectivePending
      .filter((s: any) => s.competenceKey === currentCompetenceKey)
      .sort(sortPendingItemsByDateDesc);
      
    const collectivePendingPrevious = collectivePending.filter((s: any) => !s.competenceKey || s.competenceKey < currentCompetenceKey);
    const rawTotalCollectivePendingPrevious = collectivePendingPrevious.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    const rawTotalCollectivePendingCurrent = collectivePendingCurrent.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    
    const bulkAppliedToPrevious = Math.min(totalBulkPayments, rawTotalCollectivePendingPrevious);
    const bulkRemainder = totalBulkPayments - bulkAppliedToPrevious;
    const totalCollectivePendingPrevious = Math.max(0, rawTotalCollectivePendingPrevious - bulkAppliedToPrevious);
    const totalCollectivePendingCurrent = Math.max(0, rawTotalCollectivePendingCurrent - bulkRemainder);
    
    const applyBulkToItems = (items: any[], amountToApply: number) => {
      if (amountToApply <= 0.01) return items;
      
      const sortedItems = [...items].sort((a, b) => {
        const dateA = a.expenses?.purchase_date || "9999-12-31";
        const dateB = b.expenses?.purchase_date || "9999-12-31";
        return dateA.localeCompare(dateB);
      });

      let remainingBulkCents = Math.round(amountToApply * 100);
      const result = [];

      for (const item of sortedItems) {
        const itemAmountCents = Math.round(Number(item.amount) * 100);
        if (remainingBulkCents >= itemAmountCents) {
          remainingBulkCents -= itemAmountCents;
        } else if (remainingBulkCents > 0) {
          result.push({
            ...item,
            amount: (itemAmountCents - remainingBulkCents) / 100,
            originalAmount: itemAmountCents / 100
          });
          remainingBulkCents = 0;
        } else {
          result.push(item);
        }
      }

      return result.sort(sortPendingItemsByDateDesc);
    };

    const displayCollectivePendingPrevious = totalCollectivePendingPrevious > 0.01
      ? applyBulkToItems(collectivePendingPrevious, bulkAppliedToPrevious)
      : [];
      
    const displayCollectivePendingCurrent = totalCollectivePendingCurrent > 0.01
      ? applyBulkToItems(collectivePendingCurrent, bulkRemainder)
      : [];

    const collectivePendingPreviousByCompetence = totalCollectivePendingPrevious <= 0.01 ? [] : groupPendingByCompetence(displayCollectivePendingPrevious);
    const collectivePendingCurrentByCompetence = totalCollectivePendingCurrent <= 0.01 ? [] : groupPendingByCompetence(displayCollectivePendingCurrent);

    const manualIndividualPending = pendingSplits.filter((s: any) => {
      const isIndividual = s.expenses?.expense_type === "individual";
      const isNotCreditCard = s.expenses?.payment_method !== "credit_card";
      const hasNoPayment = !(s.payments || []).some((p: any) => p.status === 'pending' || p.status === 'confirmed');
      
      const compKey = resolvePendingCompetenceKey({
        competenceKey: s.expenses?.competence_key,
        purchaseDate: s.expenses?.purchase_date,
        closingDay,
        getCompetenceKeyFromDate,
      });
      const isInCycle = compKey === currentCompetenceKey;

      return isIndividual && isNotCreditCard && hasNoPayment && isInCycle;
    });

    const installmentIndividualPending = billInstallments.filter((i: any) => 
      i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal"
    ).map((i: any) => ({
      id: i.id,
      amount: i.amount,
      installment_number: i.installment_number,
      expenses: i.expenses
    }));

    const individualPending = [...manualIndividualPending, ...installmentIndividualPending]
      .sort((a: any, b: any) => (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || ""));
      
    const totalIndividualPending = individualPending.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    const totalUserExpensesCompetence = myCollectiveShare + totalIndividualPending;
    const totalUserExpensesCurrentBalance = totalUserExpensesCompetence + totalCollectivePendingPrevious;

    const cardsBreakdown = (() => {
      const map: Record<string, number> = {};
      creditCards.forEach(c => map[c.id] = 0);
      billInstallments.forEach((i: any) => {
        const cId = i.expenses?.credit_card_id;
        if (cId && map[cId] !== undefined) {
          map[cId] += Number(i.amount);
        }
      });
      return map;
    })();

    const cardsChartData = (() => {
      const categories: Record<string, number> = {};
      billInstallments.forEach((i: any) => {
        const rawCat = i.expenses?.category || "other";
        const label = getCategoryLabel(rawCat);
        categories[label] = (categories[label] || 0) + Number(i.amount);
      });
      return Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    })();

    return {
      // Raw data
      expensesInCycle,
      pendingSplits,
      myBulkPayments,
      creditCards,
      participantOptions,
      billInstallments,
      p2pBalances,
      
      // Cycle dates
      currentDate,
      cycleStart,
      cycleEnd,
      cycleLimitDate,
      closingDay,
      currentCompetenceKey,

      // Collective data
      totalMonthExpenses,
      myCollectiveShare,
      republicChartData,
      
      // Personal data
      myPersonalExpenses,
      totalPersonalCash,
      totalBill,
      personalChartData,
      
      // Pending data
      totalCollectivePendingPrevious,
      totalCollectivePendingCurrent,
      collectivePendingPreviousByCompetence,
      collectivePendingCurrentByCompetence,
      displayCollectivePendingPrevious,
      displayCollectivePendingCurrent,
      individualPending,
      totalIndividualPending,
      
      // Totals
      totalUserExpensesCompetence,
      totalUserExpensesCurrentBalance,
      
      // Cards data
      cardsBreakdown,
      cardsChartData,
    };
  }, [
    isLoading, user, closingDay, currentCompetenceKey,
    expensesInCycle, pendingSplits, myBulkPayments, creditCards, 
    participantOptions, billInstallments, p2pBalances
  ]);

  return {
    data: processedData,
    isLoading,
    cycleManagement: {
      currentDate,
      setCurrentDate,
      nextMonth,
      prevMonth,
      cycleStart,
      cycleEnd,
      cycleLimitDate,
      closingDay,
    }
  };
}
