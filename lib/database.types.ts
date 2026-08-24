export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Generated-schema equivalent for the two tables owned by Overturn. Keep this
 * in sync with supabase/schema.sql; it prevents untyped table writes.
 */
export type Database = {
  public: {
    Tables: {
      cases: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: string;
          rejection_ground: string | null;
          source_data: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
          rejection_ground?: string | null;
          source_data?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
          rejection_ground?: string | null;
          source_data?: Json;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          case_id: string;
          sequence: number;
          event_type: string;
          payload: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          sequence?: never;
          event_type: string;
          payload?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          sequence?: never;
          event_type?: string;
          payload?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
