// This is a minimal stub. Generate the real file with:
// npx supabase gen types typescript --project-id YOUR_ID > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'editor' | 'viewer';
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          project_type: string;
          status: string;
          address: string | null;
          city: string;
          neighborhood: string | null;
          latitude: number | null;
          longitude: number | null;
          gush: string | null;
          helka: string | null;
          developer_name: string | null;
          developer_contact: string | null;
          price_min: number | null;
          price_max: number | null;
          price_per_sqm_avg: number | null;
          currency: string;
          construction_start_date: string | null;
          expected_completion_date: string | null;
          actual_completion_date: string | null;
          total_units: number | null;
          available_units: number | null;
          floors: number | null;
          cover_image_url: string | null;
          external_ids: Json;
          tags: string[];
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['projects']['Row']> & { name: string; slug: string; city: string };
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
      };
      project_media: {
        Row: {
          id: string;
          project_id: string;
          media_type: string;
          storage_path: string;
          public_url: string | null;
          file_name: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          width: number | null;
          height: number | null;
          title: string | null;
          description: string | null;
          display_order: number;
          is_cover: boolean;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['project_media']['Row']> & {
          project_id: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database['public']['Tables']['project_media']['Row']>;
      };
      project_units: {
        Row: {
          id: string;
          project_id: string;
          unit_number: string;
          floor: number | null;
          rooms: number | null;
          area_sqm: number | null;
          balcony_area_sqm: number | null;
          garden_area_sqm: number | null;
          parking_spots: number;
          storage_units: number;
          price: number | null;
          price_per_sqm: number | null;
          status: 'available' | 'reserved' | 'sold' | 'unavailable';
          direction: string | null;
          floor_plan_url: string | null;
          notes: string | null;
          sold_at: string | null;
          sold_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['project_units']['Row']> & {
          project_id: string;
          unit_number: string;
        };
        Update: Partial<Database['public']['Tables']['project_units']['Row']>;
      };
      market_listings: { Row: any; Insert: any; Update: any };
      scraping_jobs: { Row: any; Insert: any; Update: any };
    };
    Views: {
      v_price_trends_by_city: { Row: any };
      v_neighborhood_comparison: { Row: any };
      v_project_market_comparison: { Row: any };
      v_scraping_health: { Row: any };
    };
    Functions: {};
    Enums: {
      user_role: 'admin' | 'editor' | 'viewer';
      project_status: 'planning' | 'pre_sale' | 'under_construction' | 'completed' | 'sold_out' | 'archived';
      project_type: 'residential' | 'commercial' | 'mixed_use' | 'office' | 'retail' | 'industrial';
      media_type: 'image' | 'rendering' | 'floor_plan' | 'site_plan' | 'document' | 'video';
      unit_status: 'available' | 'reserved' | 'sold' | 'unavailable';
      data_source: 'yad2' | 'madlan' | 'tax_authority' | 'manual' | 'other';
    };
  };
}
