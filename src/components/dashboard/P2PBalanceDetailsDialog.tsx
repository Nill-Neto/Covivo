import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpRight, ArrowDownLeft, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { MyP2PBalance } from "@/types/dashboard";
import type { User } from "@supabase/supabase-js";

// Helper function to format competence key
const formatCompetence = (key: string) => {
  if (key === 'unknown') return 'Data não especificada';
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return format(date, "MMMM/yyyy", { locale: ptBR });
};

interface P2PBalanceItem {
  id: string;
  amount: number;
  expenses: {
    title: string | null;
    purchase_date: string | null;
    competence_key: string | null;
    created_at: string | null;
  } | null;
}

interface P2PBalanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User | null;
  otherUser: MyP2PBalance | null;
}

export function P2PBalanceDetailsDialog({ open, onOpenChange, currentUser, otherUser }: P2PBalanceDetailsDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['p2p-details', currentUser?.id, otherUser?.other_user_id],
    queryFn: async () => {
      if (!currentUser || !otherUser) return null;

      const { data: debts, error: debtsError } = await supabase
        .from('expense_splits')
        .select('id, amount, expenses(title, purchase_date, competence_key, created_at)')
        .eq('user_id', currentUser.id)
        .eq('credor_user_id', otherUser.other_user_id)
        .eq('status', 'pending');
      if (debtsError) throw debtsError;

      const { data: credits, error: creditsError } = await supabase
        .from('expense_splits')
        .select('id, amount, expenses(title, purchase_date, competence_key, created_at)')
        .eq('user_id', otherUser.other_user_id)
        .eq('credor_user_id', currentUser.id)
        .eq('status', 'pending');
      if (creditsError) throw creditsError;

      return { debts, credits };
    },
    enabled: open && !!currentUser && !!otherUser,
  });

  const { groupedDebts, groupedCredits } = useMemo(() => {
    const group = (items: P2PBalanceItem[]) => {
      if (!items) return {};
      return items.reduce((acc, item) => {
        const key = item.expenses?.competence_key || 'unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {} as Record<string, P2PBalanceItem[]>);
    };

    return {
      groupedDebts: group(data?.debts as P2PBalanceItem[]),
      groupedCredits: group(data?.credits as P2PBalanceItem[]),
    };
  }, [data]);

  const totalDebt = data?.debts?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;
  const totalCredit = data?.credits?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;
  const netBalance = Number(otherUser?.net_balance ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={otherUser?.other_user_avatar_url ?? undefined} />
              <AvatarFallback>{otherUser?.other_user_full_name?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <span>Balanço com {otherUser?.other_user_full_name}</span>
          </DialogTitle>
          <DialogDescription>
            Saldo líquido pendente: <span className={netBalance < 0 ? 'text-destructive' : 'text-success'}>R$ {netBalance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col p-5 gap-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><CustomLoader /></div>
          ) : error ? (
            <p className="text-destructive text-sm">Erro ao carregar detalhes.</p>
          ) : (
            <>
              <CompetenceGroup
                title={`Você deve para ${otherUser?.other_user_full_name}`}
                totalAmount={totalDebt}
                groupedItems={groupedDebts}
                type="debt"
              />
              <CompetenceGroup
                title={`${otherUser?.other_user_full_name} te deve`}
                totalAmount={totalCredit}
                groupedItems={groupedCredits}
                type="credit"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompetenceGroup({ title, totalAmount, groupedItems, type }: {
  title: string;
  totalAmount: number;
  groupedItems: Record<string, P2PBalanceItem[]>;
  type: 'debt' | 'credit';
}) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = type === 'debt' ? ArrowUpRight : ArrowDownLeft;
  const textColor = type === 'debt' ? 'text-destructive' : 'text-success';

  const sortedCompetenceKeys = Object.keys(groupedItems).sort().reverse();

  if (Object.keys(groupedItems).length === 0) {
    return (
      <div>
        <h3 className={cn("text-sm font-medium flex items-center justify-between gap-2 mb-3", textColor)}>
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title} (R$ {totalAmount.toFixed(2)})
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">{type === 'debt' ? 'Nenhuma dívida pendente com esta pessoa.' : 'Nenhum crédito pendente com esta pessoa.'}</p>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 flex flex-col min-h-0">
      <CollapsibleTrigger className="w-full shrink-0">
        <h3 className={cn("text-sm font-medium flex items-center justify-between gap-2 mb-3", textColor)}>
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title} (R$ {totalAmount.toFixed(2)})
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </h3>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-4 pr-4">
          {sortedCompetenceKeys.map(competenceKey => (
            <div key={competenceKey}>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                {formatCompetence(competenceKey)}
              </h4>
              <div className="space-y-2">
                {groupedItems[competenceKey]
                  .sort((a, b) => new Date(b.expenses?.created_at ?? 0).getTime() - new Date(a.expenses?.created_at ?? 0).getTime())
                  .map(item => <DetailItem key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DetailItem({ item }: { item: P2PBalanceItem }) {
  return (
    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
      <div>
        <p className="font-medium">{item.expenses?.title || "Despesa sem título"}</p>
        <p className="text-xs text-muted-foreground">
          {item.expenses?.purchase_date ? format(new Date(item.expenses.purchase_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Data indisponível'}
        </p>
      </div>
      <span className="font-semibold">R$ {Number(item.amount).toFixed(2)}</span>
    </div>
  );
}