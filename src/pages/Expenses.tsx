import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Calendar, Users, User, Save, Upload, Edit, Trash2, ExternalLink, CheckCircle2, DollarSign, CreditCard, Layers } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIES = [
  { value: "rent", label: "Aluguel" },
  { value: "utilities", label: "Contas (Luz/Água/Gás)" },
  { value: "internet", label: "Internet/TV" },
  { value: "cleaning", label: "Limpeza" },
  { value: "maintenance", label: "Manutenção" },
  { value: "groceries", label: "Mercado" },
  { value: "other", label: "Outros" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit_card", label: "Cartão de Crédito" },
];

export default function Expenses() {
  const { membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for Create/Edit
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseType, setExpenseType] = useState<"collective" | "individual">(isAdmin ? "collective" : "individual");
  const [dueDate, setDueDate] = useState(""); // Used as purchase_date mostly
  const [description, setDescription] = useState("");
  
  // New Payment Fields
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState<string>("none");
  const [installments, setInstallments] = useState("1");

  const [saving, setSaving] = useState(false);

  // State for Payments (Pay Provider)
  const [payProviderOpen, setPayProviderOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (!editingId) {
      setExpenseType(isAdmin ? "collective" : "individual");
    }
  }, [isAdmin, editingId]);

  useEffect(() => {
    if (category !== "other") {
      setCustomCategory("");
    }
  }, [category]);

  // Fetch Expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", membership?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_splits(id, user_id, amount, status, paid_at)")
        .eq("group_id", membership!.group_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!membership?.group_id,
  });

  // Fetch Credit Cards
  const { data: cards = [] } = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const collectiveExpenses = (expenses ?? []).filter((e) => e.expense_type === "collective");

  // --- Actions ---

  const handleSave = async () => {
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      toast({ title: "Erro", description: "Preencha título e valor.", variant: "destructive" });
      return;
    }

    const isCollective = expenseType === "collective";
    if (isCollective && !isAdmin && !editingId) {
      toast({ title: "Sem permissão", description: "Apenas administradores podem criar despesas coletivas.", variant: "destructive" });
      return;
    }

    if (category === "other" && !customCategory.trim()) {
      toast({ title: "Erro", description: "Informe o nome da categoria.", variant: "destructive" });
      return;
    }

    if (paymentMethod === "credit_card" && creditCardId === "none") {
      toast({ title: "Erro", description: "Selecione um cartão de crédito.", variant: "destructive" });
      return;
    }

    const categoryToSend = category === "other" ? customCategory.trim() : category;
    const targetUserId = isCollective ? null : user?.id;
    const finalCreditCardId = creditCardId === "none" ? null : creditCardId;

    setSaving(true);
    try {
      if (editingId) {
        // Edit Mode
        const { error } = await supabase
          .from("expenses")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            amount: parseFloat(amount),
            category: categoryToSend,
            due_date: dueDate || null,
            purchase_date: dueDate || null, // Keeping simple, reusing due_date field UI as date
            payment_method: paymentMethod,
            credit_card_id: finalCreditCardId,
            installments: parseInt(installments) || 1,
          })
          .eq("id", editingId);
        
        if (error) throw error;
        toast({ title: "Despesa atualizada!" });
      } else {
        // Create Mode
        const { error } = await supabase.rpc("create_expense_with_splits", {
          _group_id: membership!.group_id,
          _title: title.trim(),
          _description: description.trim() || null,
          _amount: parseFloat(amount),
          _category: categoryToSend,
          _expense_type: expenseType,
          _due_date: null, // Legacy due_date
          _receipt_url: null, 
          _recurring_expense_id: null,
          _target_user_id: targetUserId,
          // New params
          _payment_method: paymentMethod,
          _credit_card_id: finalCreditCardId,
          _installments: parseInt(installments) || 1,
          _purchase_date: dueDate || null // UI field reused as Date
        });
        if (error) throw error;
        toast({ title: "Despesa criada!" });
      }

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Despesa excluída." });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handlePayProvider = async () => {
    if (!receiptFile) {
      toast({ title: "Erro", description: "Comprovante é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_provider.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receiptFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const { error } = await supabase
        .from("expenses")
        .update({
          paid_to_provider: true,
          receipt_url: urlData.publicUrl,
        })
        .eq("id", selectedExpense.id);
      
      if (error) throw error;

      toast({ title: "Pagamento registrado!" });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setPayProviderOpen(false);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // --- Helpers ---

  const openEdit = (expense: any) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setDescription(expense.description || "");
    setDueDate(expense.purchase_date || expense.due_date || "");
    setExpenseType(expense.expense_type);
    
    // New fields
    setPaymentMethod(expense.payment_method || "cash");
    setCreditCardId(expense.credit_card_id || "none");
    setInstallments(String(expense.installments || 1));
    
    const isStandardCat = CATEGORIES.some(c => c.value === expense.category);
    if (isStandardCat) {
      setCategory(expense.category);
      setCustomCategory("");
    } else {
      setCategory("other");
      setCustomCategory(expense.category);
    }
    
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("other");
    setCustomCategory("");
    setExpenseType(isAdmin ? "collective" : "individual");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setDescription("");
    setReceiptFile(null);
    setPaymentMethod("cash");
    setCreditCardId("none");
    setInstallments("1");
  };

  const mySplits =
    expenses?.flatMap((e) =>
      (e.expense_splits ?? [])
        .filter((s: any) => s.user_id === user?.id)
        .map((s: any) => ({ ...s, expense: e })),
    ) ?? [];

  const selectedCardLabel = useMemo(() => {
    if (creditCardId === "none") return null;
    return cards.find(c => c.id === creditCardId)?.label;
  }, [creditCardId, cards]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Despesas</h1>
          <p className="text-muted-foreground mt-1">{expenses?.length ?? 0} despesa(s) registrada(s)</p>
        </div>
        
        <Button className="gap-2" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          {isAdmin ? "Nova despesa" : "Nova despesa individual"}
        </Button>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={expenseType} 
                    onValueChange={(v) => setExpenseType(v as "collective" | "individual")}
                    disabled={!!editingId} 
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <SelectItem value="collective">
                          <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Coletiva</div>
                        </SelectItem>
                      )}
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /> Individual</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Conta de luz - Janeiro" maxLength={200} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {category === "other" && (
                <div className="space-y-2">
                   <Label>Nome da Categoria</Label>
                   <Input placeholder="Ex: Farmácia" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
                </div>
              )}

              {/* Payment Method Section */}
              <div className="space-y-3 pt-2 border-t">
                 <Label className="text-base font-medium">Pagamento</Label>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                       <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
                       <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    
                    {paymentMethod === "credit_card" && (
                      <div className="space-y-2">
                         <Label className="text-xs text-muted-foreground">Cartão</Label>
                         <Select value={creditCardId} onValueChange={setCreditCardId}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                               {cards.length === 0 && <SelectItem value="none" disabled>Nenhum cartão</SelectItem>}
                               {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                            </SelectContent>
                         </Select>
                      </div>
                    )}
                 </div>

                 {paymentMethod === "credit_card" && (
                    <div className="space-y-2">
                       <Label className="text-xs text-muted-foreground">Parcelas</Label>
                       <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="1" 
                            max="36" 
                            value={installments} 
                            onChange={(e) => setInstallments(e.target.value)} 
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">x de R$ {(Number(amount) / (parseInt(installments) || 1)).toFixed(2)}</span>
                       </div>
                    </div>
                 )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label>Descrição (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes adicionais" />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pay Provider Dialog (Admin) */}
        <Dialog open={payProviderOpen} onOpenChange={setPayProviderOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Pagar Concessionária/Fornecedor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirme o pagamento da despesa <strong>{selectedExpense?.title}</strong> no valor de <strong>R$ {selectedExpense?.amount}</strong>.
              </p>
              <div className="space-y-2">
                <Label>Comprovante *</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayProviderOpen(false)}>Cancelar</Button>
                <Button onClick={handlePayProvider} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar Pagamento
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="mine">Minhas</TabsTrigger>
          <TabsTrigger value="collective">Coletivas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {expenses?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Nenhuma despesa registrada.</CardContent>
            </Card>
          )}
          {expenses?.map((e) => (
            <ExpenseCard 
              key={e.id} 
              expense={e} 
              userId={user?.id} 
              isAdmin={isAdmin} 
              cards={cards}
              onEdit={() => openEdit(e)} 
              onDelete={() => handleDelete(e.id)}
              onPayProvider={() => { setSelectedExpense(e); setReceiptFile(null); setPayProviderOpen(true); }}
            />
          ))}
        </TabsContent>

        <TabsContent value="mine" className="space-y-3 mt-4">
          {mySplits.map((s: any) => (
            <ExpenseCard 
              key={s.id} 
              expense={s.expense} 
              userId={user?.id} 
              highlightSplit={s} 
              isAdmin={isAdmin}
              cards={cards}
              onEdit={() => openEdit(s.expense)} 
              onDelete={() => handleDelete(s.expense.id)}
              onPayProvider={() => { setSelectedExpense(s.expense); setReceiptFile(null); setPayProviderOpen(true); }}
            />
          ))}
        </TabsContent>

        <TabsContent value="collective" className="space-y-3 mt-4">
          {collectiveExpenses.map((e) => (
            <ExpenseCard 
              key={e.id} 
              expense={e} 
              userId={user?.id} 
              isAdmin={isAdmin} 
              cards={cards}
              onEdit={() => openEdit(e)} 
              onDelete={() => handleDelete(e.id)}
              onPayProvider={() => { setSelectedExpense(e); setReceiptFile(null); setPayProviderOpen(true); }}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpenseCard({ 
  expense, userId, highlightSplit, isAdmin, cards,
  onEdit, onDelete, onPayProvider 
}: { 
  expense: any; userId?: string; highlightSplit?: any; isAdmin: boolean; cards: any[];
  onEdit: () => void; onDelete: () => void; onPayProvider: () => void;
}) {
  const mySplit = highlightSplit ?? expense.expense_splits?.find((s: any) => s.user_id === userId);
  const catLabel = CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category;
  
  // Permissions
  const canEdit = isAdmin || (expense.created_by === userId && expense.expense_type === 'individual');
  const showPayProvider = isAdmin && expense.expense_type === 'collective' && !expense.paid_to_provider;

  const cardLabel = expense.credit_card_id ? cards.find(c => c.id === expense.credit_card_id)?.label : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium">{expense.title}</p>
              <Badge variant="outline" className="text-xs">{catLabel}</Badge>
              <Badge variant={expense.expense_type === "collective" ? "default" : "secondary"} className="text-xs">
                {expense.expense_type === "collective" ? "Coletiva" : "Individual"}
              </Badge>
              {expense.paid_to_provider && (
                 <Badge variant="outline" className="text-xs border-success text-success flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Paga ao fornecedor
                 </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
               <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {expense.purchase_date ? format(new Date(expense.purchase_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : 
                 format(new Date(expense.created_at), "dd/MM/yyyy", { locale: ptBR })}
               </span>
               
               {expense.payment_method === "credit_card" ? (
                 <span className="flex items-center gap-1">
                   <CreditCard className="h-3 w-3" /> 
                   {cardLabel ? `${cardLabel}` : "Cartão"}
                   {expense.installments > 1 && ` (${expense.installments}x)`}
                 </span>
               ) : (
                 <span className="capitalize">{PAYMENT_METHODS.find(p => p.value === expense.payment_method)?.label || expense.payment_method || "Dinheiro"}</span>
               )}

               {expense.receipt_url && (
                <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Comprovante
                </a>
               )}
            </div>

            {expense.description && <p className="text-xs text-muted-foreground mt-2 border-l-2 pl-2 border-muted">{expense.description}</p>}
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="text-lg font-bold font-serif">R$ {Number(expense.amount).toFixed(2)}</p>
            
            {mySplit && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Sua parte: R$ {Number(mySplit.amount).toFixed(2)}</p>
                <Badge variant={mySplit.status === "paid" ? "default" : mySplit.status === "overdue" ? "destructive" : "secondary"} className="text-xs mt-1">
                  {mySplit.status === "paid" ? "Pago" : mySplit.status === "overdue" ? "Atrasado" : "Pendente"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Actions Bar */}
        {(canEdit || showPayProvider) && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
             <div className="flex gap-2">
                {showPayProvider && (
                  <Button size="sm" variant="default" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={onPayProvider}>
                    <DollarSign className="h-3 w-3" /> Pagar Conta
                  </Button>
                )}
             </div>
             
             {canEdit && (
               <div className="flex gap-1">
                 <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Editar">
                   <Edit className="h-4 w-4" />
                 </Button>
                 <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir">
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}