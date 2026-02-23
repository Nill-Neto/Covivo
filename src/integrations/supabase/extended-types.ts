import type { Database } from "./types";

type CreditCardTable = {
  Row: {
    id: string;
    user_id: string;
    label: string;
    brand: string;
    limit_amount: number | null;
    closing_day: number;
    due_day: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    label: string;
    brand: string;
    limit_amount?: number | null;
    closing_day: number;
    due_day: number;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    label?: string;
    brand?: string;
    limit_amount?: number | null;
    closing_day?: number;
    due_day?: number;
    created_at?: string;
  };
  Relationships: [];
};

type PublicSchema = Database["public"];

export type ExtendedDatabase = Omit<Database, "public"> & {
  public: Omit<PublicSchema, "Tables"> & {
    Tables: PublicSchema["Tables"] & {
      credit_cards: CreditCardTable;
    };
  };
};