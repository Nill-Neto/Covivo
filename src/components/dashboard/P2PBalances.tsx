import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpRight, ArrowDownLeft, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { P2PBalanceDetailsDialog } from "./P2PBalanceDetailsDialog";
import type { MyP2PBalance } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface P2PBalancesProps {
  balances: MyP2PBalance[];
}

export function P2PBalances({ balances }: P2PBalancesProps) {
  const { user } = useAuth();
  const [viewingDetailsFor, setViewingDetailsFor] = useState<MyP2PBalance | null>(null);

  const debts = balances.filter(b => b.net_balance < 0).sort((a, b) => a.net_balance - b.net_balance);
  const credits = balances.filter(b => b.net_balance > 0).sort((a, b) => b.net_balance - a.net_balance);

  if (!balances || balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Balanço P2P
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Seu balanço com outros membros está zerado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ArrowUpRight className="h-5 w-5" />
              Você deve para
            </CardTitle>
            <CardDescription>Pessoas para quem você deve dinheiro.</CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceList items={debts} type="debt" onSelect={setViewingDetailsFor} emptyMessage="Ninguém para quem você deva." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <ArrowDownLeft className="h-5 w-5" />
              Quem te deve
            </CardTitle>
            <CardDescription>Pessoas que devem dinheiro para você.</CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceList items={credits} type="credit" onSelect={setViewingDetailsFor} emptyMessage="Ninguém te deve." />
          </CardContent>
        </Card>
      </div>
      <P2PBalanceDetailsDialog
        open={!!viewingDetailsFor}
        onOpenChange={(isOpen) => !isOpen && setViewingDetailsFor(null)}
        currentUser={user}
        otherUser={viewingDetailsFor}
      />
    </>
  );
}

interface BalanceListProps {
  items: MyP2PBalance[];
  type: 'debt' | 'credit';
  onSelect: (item: MyP2PBalance) => void;
  emptyMessage: string;
}

function BalanceList({ items, type, onSelect, emptyMessage }: BalanceListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <BalanceItem key={item.other_user_id} user={item} type={type} onClick={() => onSelect(item)} />
      ))}
    </div>
  );
}

function BalanceItem({ user, type, onClick }: { user: MyP2PBalance, type: 'debt' | 'credit', onClick: () => void }) {
  const initials = (user.other_user_full_name || "?").charAt(0);
  const amount = Math.abs(user.net_balance);
  const colorClass = type === 'debt' ? 'text-destructive' : 'text-success';

  return (
    <button 
      onClick={onClick} 
      className="flex items-center justify-between w-full text-left p-3 rounded-lg border border-transparent hover:bg-primary/5 hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.other_user_avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="font-semibold">{user.other_user_full_name}</span>
      </div>
      <span className={cn("font-bold text-lg", colorClass)}>
        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </button>
  );
}