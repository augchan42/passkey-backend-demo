export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      passkey_credentials: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          public_key: Buffer;
          counter: number;
          device_type?: string;
          created_at: string;
          last_used_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credential_id: string;
          public_key: Buffer;
          counter: number;
          device_type?: string;
          created_at?: string;
          last_used_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credential_id?: string;
          public_key?: Buffer;
          counter?: number;
          device_type?: string;
          created_at?: string;
          last_used_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
