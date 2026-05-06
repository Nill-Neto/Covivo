import {
  LayoutDashboard,
  Users,
  UserPlus,
  ScrollText,
  Receipt,
  CreditCard,
  RefreshCw,
  Package,
  ShoppingCart,
  MessageSquare,
  BookOpen,
  Vote,
  Shield,
} from "lucide-react";

export const sidebarCoreItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel Geral" },
  { to: "/expenses", icon: Receipt, label: "Despesas" },
  { to: "/payments", icon: CreditCard, label: "Pagamentos" },
  { to: "/inventory", icon: Package, label: "Estoque" },
  { to: "/shopping", icon: ShoppingCart, label: "Compras" },
];

export const adminItems = [
  { to: "/recurring", icon: RefreshCw, label: "Recorrências" },
  { to: "/invites", icon: UserPlus, label: "Convites" },
  { to: "/audit-log", icon: ScrollText, label: "Histórico" },
];

export const convenienceItems = [
  { to: "/bulletin", icon: MessageSquare, label: "Mural" },
  { to: "/rules", icon: BookOpen, label: "Regras" },
  { to: "/polls", icon: Vote, label: "Votações" },
  { to: "/members", icon: Users, label: "Moradores" },
];

export const adminPageItem = { to: "/admin", icon: Shield, label: "Administração" };
