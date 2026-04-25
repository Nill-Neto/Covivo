import type { PendingByCompetenceGroup } from "@/lib/collectivePending";
import type { Tables } from "@/integrations/supabase/types";

// Shared types
export interface ChartDataPoint {
  name: string;
  value: number;
}

// PersonalTab types
export interface P2PBalance {
  other_user_id: string;
  other_user_full_name: string;
  other_user_avatar_url: string | null;
  net_balance: number;
}

export interface IndividualPendingItem {
  id: string;
  amount: number;
  installment_number?: number;
  expenses?: {
    title?: string | null;
    category?: string | null;
    purchase_date?: string | null;
    installments?: number;
  };
}

export interface PersonalExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  purchase_date: string;
  payment_method: string;
  installments?: number;
  installment_number?: number;
}

export interface PendingSplit {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  expense_id: string;
  expenses: {
    title: string | null;
    category: string | null;
    group_id: string;
    expense_type: string;
    created_at: string;
    purchase_date: string | null;
    payment_method: string | null;
    credit_card_id: string | null;
    installments: number | null;
    competence_key: string | null;
    credit_cards: {
      closing_day: number;
    } | null;
  } | null;
  payments: {
    id: string;
    status: string;
  }[];
  competenceKey?: string | null;
  originalAmount?: number;
}

export interface PersonalTabProps {
  modoGestao: 'centralized' | 'p2p';
  p2pBalances: P2PBalance[];
  closingDay: number;
  currentDate: Date;
  totalIndividualPending: number;
  totalCollectivePendingPrevious: number;
  totalCollectivePendingCurrent: number;
  collectivePendingPreviousByCompetence: PendingByCompetenceGroup[];
  collectivePendingCurrentByCompetence: PendingByCompetenceGroup[];
  individualPending: IndividualPendingItem[];
  totalPersonalCash: number;
  totalBill: number;
  totalUserExpensesCompetence: number;
  totalUserExpensesCurrentBalance: number;
  myCollectiveShare: number;
  personalChartData: ChartDataPoint[];
  myPersonalExpenses: PersonalExpenseItem[];
  republicChartData: ChartDataPoint[];
  totalMonthExpenses: number;
  onPayRateio: (scope: 'previous' | 'current') => void;
}

// CardsTab types
export type CreditCard = Tables<"credit_cards">;

export interface BillInstallment {
  id: string;
  amount: number;
  installment_number: number;
  expenses?: {
    title?: string | null;
    category?: string | null;
    credit_card_id?: string | null;
    expense_type?: string;
    purchase_date?: string | null;
    installments?: number;
    created_at?: string;
  };
}

export interface CardsTabProps {
  totalBill: number;
  currentDate: Date;
  cardsChartData: ChartDataPoint[];
  creditCards: CreditCard[];
  cardsBreakdown: Record<string, number>;
  billInstallments: BillInstallment[];
  isLoading?: boolean;
}

export type GroupInstallmentItem = Tables<"expense_installments"> & {
  expenses: {
    expense_type: string;
    group_id: string;
    credit_card_id: string | null;
  } | null;
};
export type PersonalInstallmentItem = Tables<"personal_expense_installments"> & {
  personal_expenses: {
    credit_card_id: string | null;
  } | null;
};