export const MISSING_COMPETENCE_LABEL = "Sem competência";

export type PendingSplitItem = {
  id: string;
  amount: number;
  originalAmount?: number;
  competenceKey?: string | null;
  expenses?: {
    title?: string | null;
    purchase_date?: string | null;
  };
};

export type PendingByCompetenceGroup = {
  competenceKey: string | null;
  competenceLabel: string;
  total: number;
  items: PendingSplitItem[];
};

const sortByPurchaseDateDesc = (a: PendingSplitItem, b: PendingSplitItem) =>
  (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || "");

export const sortByCompetenceLabelDesc = (a: PendingByCompetenceGroup, b: PendingByCompetenceGroup) => {
  if (a.competenceKey === null) return 1;
  if (b.competenceKey === null) return -1;
  return b.competenceKey.localeCompare(a.competenceKey);
};

export const groupPendingByCompetence = (items: PendingSplitItem[]): PendingByCompetenceGroup[] => {
  const grouped = items.reduce((acc, item) => {
    const competenceKey = item.competenceKey || null;
    if (!acc[competenceKey ?? "__missing__"]) {
      acc[competenceKey ?? "__missing__"] = {
        competenceKey,
        competenceLabel: competenceKey
          ? `${competenceKey.slice(5, 7)}/${competenceKey.slice(0, 4)}`
          : MISSING_COMPETENCE_LABEL,
        total: 0,
        items: [],
      };
    }

    acc[competenceKey ?? "__missing__"].items.push(item);
    acc[competenceKey ?? "__missing__"].total += Number(item.amount);
    return acc;
  }, {} as Record<string, PendingByCompetenceGroup>);

  return Object.values(grouped)
    .map((group) => ({
      ...group,
      items: [...group.items].sort(sortByPurchaseDateDesc),
    }))
    .sort(sortByCompetenceLabelDesc);
};
