import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2, Shield, User } from "lucide-react";

export default function Members() {
  const { membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  // State for Edit Dialog
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editRole, setEditRole] = useState("morador");
  const [editPercentage, setEditPercentage] = useState("0");
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch Group Details (to check splitting rule)
  const { data: group } = useQuery({
    queryKey: ["group-details-members", membership?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("groups")
        .select("splitting_rule")
        .eq("id", membership!.group_id)
        .single();
      return data;
    },
    enabled: !!membership?.group_id,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", membership?.group_id],
    queryFn: async () => {
      const { data: groupMembers, error: gmErr } = await supabase
        .from("group_members")
        .select("user_id, split_percentage, joined_at, active")
        .eq("group_id", membership!.group_id)
        .eq("active", true);
      if (gmErr) throw gmErr;

      const userIds = groupMembers.map((gm) => gm.user_id);

      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from("group_member_profiles")
          .select("id, full_name, avatar_url")
          .eq("group_id", membership!.group_id)
          .in("id", userIds),
        supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("group_id", membership!.group_id),
      ]);

      return groupMembers.map((gm) => {
        const profile = profiles?.find((p) => p.id === gm.user_id);
        const role = roles?.find((r) => r.user_id === gm.user_id);
        return {
          ...gm,
          profile,
          role: role?.role as "admin" | "morador" | undefined,
        };
      });
    },
    enabled: !!membership?.group_id,
  });

  const updateMember = useMutation({
    mutationFn: async () => {
      if (!editingMember) return;

      // 1. Update Role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .update({ role: editRole as "admin" | "morador" })
        .eq("group_id", membership!.group_id)
        .eq("user_id", editingMember.user_id);

      if (roleErr) throw roleErr;

      // 2. Update Percentage (if applicable)
      if (group?.splitting_rule === "percentage") {
        const { error: pctErr } = await supabase
          .from("group_members")
          .update({ split_percentage: Number(editPercentage) })
          .eq("group_id", membership!.group_id)
          .eq("user_id", editingMember.user_id);
        if (pctErr) throw pctErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setIsEditOpen(false);
      toast({ title: "Membro atualizado com sucesso!" });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao atualizar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      // Soft delete: set active = false and left_at = now()
      const { error } = await supabase
        .from("group_members")
        .update({ active: false, left_at: new Date().toISOString() })
        .eq("group_id", membership!.group_id)
        .eq("user_id", userId);

      if (error) throw error;
      
      // Also remove role to be safe/clean
      await supabase
        .from("user_roles")
        .delete()
        .eq("group_id", membership!.group_id)
        .eq("user_id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Membro removido." });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao remover",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (member: any) => {
    setEditingMember(member);
    setEditRole(member.role || "morador");
    setEditPercentage(String(member.split_percentage || 0));
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Moradores</h1>
        <p className="text-muted-foreground mt-1">
          {members?.length ?? 0} membro(s) ativo(s)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => {
          const initials = (m.profile?.full_name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          const isMe = m.user_id === user?.id;

          return (
            <Card key={m.user_id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={m.profile?.avatar_url} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {m.profile?.full_name} {isMe && "(Você)"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {m.role === "admin" ? (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> Morador
                        </span>
                      )}
                      {group?.splitting_rule === "percentage" && (
                        <span>• {m.split_percentage}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && !isMe && (
                  <div className="flex justify-end gap-2 mt-4 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                      onClick={() => openEditDialog(m)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover morador?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover{" "}
                            <strong>{m.profile?.full_name}</strong> do grupo? Ele
                            perderá acesso às informações da república.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMember.mutate(m.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Morador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Administradores podem gerenciar despesas, configurações e membros.
              </p>
            </div>

            {group?.splitting_rule === "percentage" && (
              <div className="space-y-2">
                <Label>Porcentagem do Rateio (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editPercentage}
                  onChange={(e) => setEditPercentage(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMember.mutate()}
              disabled={updateMember.isPending}
            >
              {updateMember.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}