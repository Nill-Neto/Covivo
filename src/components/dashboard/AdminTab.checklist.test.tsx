import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminTab } from "./AdminTab";
import type { AdminMember } from "@/types/admin";
import type { PendingSplit } from "@/types/dashboard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const baseDate = new Date("2026-04-10T12:00:00.000Z");

const mockMembers: AdminMember[] = [
  {
    user_id: "u-1",
    profile: { id: "u-1", full_name: "Ana Silva", avatar_url: null },
    role: 'morador',
    balance: -200,
    previous_debt: 50,
    current_cycle_owed: 150,
    current_cycle_paid: 0,
    accrued_debt: 200,
    active: true,
    total_owed: 150,
    total_paid: 0,
  },
  {
    user_id: "u-2",
    profile: { id: "u-2", full_name: "Bruno Costa", avatar_url: null },
    role: 'morador',
    balance: -40,
    previous_debt: 0,
    current_cycle_owed: 40,
    current_cycle_paid: 0,
    accrued_debt: 40,
    active: true,
    total_owed: 40,
    total_paid: 0,
  },
];

const mockPendingSplits: PendingSplit[] = [
  {
    id: 'split-1',
    user_id: 'u-1', // Ana Silva
    amount: 50,
    status: 'pending',
    expense_id: 'exp-agua',
    payments: [],
    expenses: {
      competence_key: '2026-03',
      title: 'Água',
      purchase_date: '2026-03-15',
      group_id: 'group-1',
      category: 'utilities',
      created_at: '2026-03-15T10:00:00Z',
      expense_type: 'collective',
      installments: 1,
      payment_method: 'cash',
      credit_card_id: null,
      credit_cards: null
    }
  },
  {
    id: 'split-2',
    user_id: 'u-1', // Ana Silva
    amount: 100,
    status: 'pending',
    expense_id: 'exp-luz',
    payments: [],
    expenses: {
      competence_key: '2026-02',
      title: 'Luz',
      purchase_date: '2026-02-20',
      group_id: 'group-1',
      category: 'utilities',
      created_at: '2026-02-20T10:00:00Z',
      expense_type: 'collective',
      installments: 1,
      payment_method: 'cash',
      credit_card_id: null,
      credit_cards: null
    }
  }
];


function renderAdminTab() {
  return render(
    <MemoryRouter>
      <AdminTab
        members={mockMembers}
        modoGestao="centralized"
        p2pMatrix={[]}
        collectiveExpenses={[
          {
            id: "exp-1",
            title: "Mercado",
            amount: 120,
            category: "food",
            purchase_date: "2026-04-03",
          },
        ]}
        totalMonthExpenses={120}
        cycleStart={new Date("2026-04-01T00:00:00.000Z")}
        cycleEnd={new Date("2026-05-01T00:00:00.000Z")}
        currentDate={baseDate}
        closingDay={10}
        groupId="group-1"
        pendingPaymentsCount={0}
        exMembersDebt={0}
        departuresCount={0}
        redistributedCount={0}
        lowStockCount={0}
        cycleSplits={[]}
        pendingSplits={mockPendingSplits}
        memberPaymentsByCompetence={{}}
        nonCriticalWarnings={[]}
      />
    </MemoryRouter>
  );
}

describe("Checklist funcional do AdminTab", () => {
  it("carrega dados iniciais e abre detalhes da competência", async () => {
    renderAdminTab();

    // Ensure button is there
    const detailsBtn = screen.getByText(/Ver detalhes/i);
    expect(detailsBtn).toBeInTheDocument();

    // Open modal
    fireEvent.click(detailsBtn);

    expect(await screen.findByText("Resumo da Competência")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
  });

  it("mostra o saldo principal do morador", async () => {
    renderAdminTab();

    fireEvent.click(screen.getByText(/Ver detalhes/i));

    // Ana Silva: balance = -200
    expect(await screen.findByText("-R$ 200,00")).toBeInTheDocument();
    // Bruno Costa: balance = -40
    expect(screen.getByText("-R$ 40,00")).toBeInTheDocument();
  });

  it("discrimina competências anteriores no modal e mantém itens colapsados por padrão", async () => {
    renderAdminTab();
    
    fireEvent.click(screen.getByText(/Ver detalhes/i));
    fireEvent.click(await screen.findByText("Ana Silva"));

    expect(await screen.findByText(/março 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/fevereiro 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Itens pendentes/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Água")).not.toBeInTheDocument();
    expect(screen.queryByText("Luz")).not.toBeInTheDocument();
    expect(screen.queryByText("Competência abril/2026")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText(/Itens pendentes/i)[0]);
    expect(await screen.findByText("Água")).toBeInTheDocument();
  });
});