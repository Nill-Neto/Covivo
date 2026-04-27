import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useCycleDates } from "@/hooks/useCycleDates";

export default function Admin() {
  const { membership, isAdmin, profile } = useAuth();
  const [heroCompact, setHeroCompact] = useState(false);
  
  const { currentDate, cycleStart, cycleEnd, cycleLimitDate, nextMonth, prevMonth } = useCycleDates(membership?.group_id);

  const { data: testData, isLoading, error } = useQuery<number | null>({
    queryKey: ["admin-test-value", membership?.group_id],
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id) return null;

      const { data, error: rpcError } = await supabase.rpc("get_admin_test_value");

      if (rpcError) {
        console.error('Error calling get_admin_test_value RPC:', rpcError);
        throw new Error(`Erro ao chamar a função de teste: ${rpcError.message}`);
      }
      return data;
    },
    enabled: !!membership?.group_id && isAdmin
  });

  if (!membership) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center text-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <DashboardHeader userName={profile?.full_name} groupName={membership?.group_name} currentDate={currentDate} cycleStart={cycleStart} cycleEnd={cycleEnd} cycleLimitDate={cycleLimitDate} onNextMonth={nextMonth} onPrevMonth={prevMonth} onCompactChange={setHeroCompact} />
      
      <div className="p-6 border rounded-lg bg-card">
        <h2 className="text-lg font-bold">Teste de Diagnóstico</h2>
        <p className="text-muted-foreground">Esta é uma tela de teste para isolar um erro no banco de dados.</p>
        <div className="mt-4 space-y-2">
          {isLoading && <p>Carregando teste...</p>}
          {error && (
            <div>
              <p className="text-destructive font-bold">O teste falhou.</p>
              <p className="text-sm text-muted-foreground">O erro persistiu mesmo com uma função completamente nova. Isso indica um problema mais profundo.</p>
              <pre className="mt-2 text-xs bg-muted p-2 rounded">{error.message}</pre>
            </div>
          )}
          {testData !== undefined && testData !== null && (
            <div>
              <p className="text-green-600 font-bold">O teste funcionou!</p>
              <p className="text-sm text-muted-foreground">A função de teste retornou o valor esperado, o que significa que o problema está isolado na função `get_admin_dashboard_data`.</p>
              <p className="text-lg font-mono bg-muted p-2 rounded mt-2">Valor retornado: {testData}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}