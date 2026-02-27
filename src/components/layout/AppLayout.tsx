import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Wallet,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const mainNavGroups = [
  {
    title: "Moradia",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Painel Geral" },
      { to: "/expenses", icon: Receipt, label: "Despesas" },
      { to: "/payments", icon: CreditCard, label: "Pagamentos" },
      { to: "/inventory", icon: Package, label: "Estoque" },
      { to: "/shopping", icon: ShoppingCart, label: "Compras" },
    ],
  },
  {
    title: "Minhas Finanças",
    items: [
      { to: "/personal/bills", icon: ScrollText, label: "Faturas" },
      { to: "/personal/cards", icon: Wallet, label: "Meus Cartões" },
    ],
  },
];

const convenienceItems = [
  { to: "/bulletin", icon: MessageSquare, label: "Mural" },
  { to: "/rules", icon: BookOpen, label: "Regras" },
  { to: "/polls", icon: Vote, label: "Votações" },
  { to: "/members", icon: Users, label: "Moradores" },
];

const adminGroup = {
  title: "Administração",
  items: [
    { to: "/recurring", icon: RefreshCw, label: "Recorrências" },
    { to: "/invites", icon: UserPlus, label: "Convites" },
    { to: "/audit-log", icon: ScrollText, label: "Histórico" },
  ],
};

export function AppLayout() {
  const { membership, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarGroups = isAdmin ? [...mainNavGroups, adminGroup] : mainNavGroups;

  const Logo = () => (
    <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white shadow-sm">
        R
      </div>
      <span className="text-foreground hidden xs:block">Republi-K</span>
    </Link>
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center h-16 shrink-0 px-6 md:hidden border-b border-sidebar-border bg-sidebar-background">
         <span className="text-lg font-bold tracking-tight text-sidebar-foreground">Republi-K</span>
      </div>
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-8">
          {sidebarGroups.map((group) => (
            <CollapsibleNavGroup 
              key={group.title} 
              title={group.title} 
              items={group.items} 
              location={location} 
              onItemClick={() => setMobileMenuOpen(false)}
            />
          ))}

          <div className="md:hidden">
            <CollapsibleNavGroup 
              title="Convivência" 
              items={convenienceItems} 
              location={location} 
              onItemClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header Superior Fixo com mais cor */}
      <header className="z-50 relative flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        {/* Colorful top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-blue-500 to-indigo-600" />
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-12 w-12 hover:bg-primary/5 active:scale-95 transition-transform"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuToggleIcon open={mobileMenuOpen} className="h-8 w-8 scale-125 text-primary" />
            <span className="sr-only">Menu</span>
          </Button>

          <Logo />

          {membership && (
            <div className="hidden sm:flex items-center gap-2 border-l pl-4 min-w-0">
              <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider whitespace-nowrap">
                Moradia
              </span>
              <span className="text-sm font-bold truncate bg-primary/10 text-primary px-2 py-0.5 rounded-full">{membership.group_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-1 border-r pr-4 mr-2">
            {convenienceItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <motion.div
                    className={cn(
                      "flex items-center rounded-full transition-all duration-300 h-9 px-3 relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "bg-transparent text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    
                    <motion.div
                      initial={false}
                      animate={{
                        width: isActive ? "auto" : 0,
                        opacity: isActive ? 1 : 0,
                        marginLeft: isActive ? 8 : 0,
                      }}
                      className="overflow-hidden flex items-center"
                    >
                      <span className="text-sm font-bold whitespace-nowrap">
                        {item.label}
                      </span>
                    </motion.div>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <AnimatedThemeToggler />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Sidebar + Main) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col overflow-y-auto shadow-xl">
          <SidebarContent />
        </aside>

        {/* Sidebar Mobile */}
        {mobileMenuOpen && (
          <>
            <div 
              className="absolute inset-0 z-30 md:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-300" 
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute top-0 left-0 bottom-0 z-40 w-64 md:hidden bg-sidebar text-sidebar-foreground shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300 border-r border-sidebar-border">
              <SidebarContent />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background relative">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function CollapsibleNavGroup({
  title,
  items,
  location,
  onItemClick,
}: {
  title: string;
  items: { to: string; icon: any; label: string }[];
  location: any;
  onItemClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1 hover:bg-sidebar-accent/50 rounded-md transition-colors group cursor-pointer">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 group-hover:text-sidebar-foreground">
          {title}
        </h4>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all relative",
                isActive
                  ? "bg-primary/20 text-white shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary brightness-150" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")}
              />
              {item.label}
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}