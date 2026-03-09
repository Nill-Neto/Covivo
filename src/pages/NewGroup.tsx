import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";

type SplittingRule = "equal" | "percentage";

export default function NewGroup() {
  const { refreshMembership, setActiveGroupId } = useAuth();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [splittingRule, setSplittingRule] = useState<SplittingRule>("equal");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({ title: "Erro", description: "Informe o nome do grupo.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("create_group_with_admin", {
        _name: groupName.trim(),
        _description: groupDescription.trim() || null,
        _splitting_rule: splittingRule,
      });
      if (error) throw error;

      const newGroupId = data as string;
      await refreshMembership();
      setActiveGroupId(newGroupId);

      toast({ title: "Grupo criado!", description: `"${groupName}" está pronto. Convide seus moradores.` });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <PageHero
        title="Novo Grupo"
        subtitle="Crie uma nova moradia para administrar."
        tone="default"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da moradia</CardTitle>
          <CardDescription>Você será o administrador deste grupo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="groupName">Nome da moradia</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder='Ex: "República Central"'
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupDesc">Descrição (opcional)</Label>
            <Input
              id="groupDesc"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Endereço ou detalhes da moradia"
            />
          </div>

          <div className="space-y-2">
            <Label>Regra de rateio padrão</Label>
            <Select value={splittingRule} onValueChange={(v) => setSplittingRule(v as SplittingRule)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Divisão igualitária</SelectItem>
                <SelectItem value="percentage">Por peso/percentual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Grupo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
