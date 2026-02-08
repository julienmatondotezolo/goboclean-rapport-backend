import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async getReport(reportId: string) {
    const { data, error } = await this.supabase
      .from('reports')
      .select(`
        *,
        worker:users!worker_id(
          id,
          email,
          first_name,
          last_name
        ),
        photos(*)
      `)
      .eq('id', reportId)
      .single();

    if (error) throw error;
    return data;
  }

  async getReports(workerId?: string) {
    let query = this.supabase
      .from('reports')
      .select(`
        *,
        worker:users!worker_id(
          id,
          first_name,
          last_name
        ),
        photos(count)
      `)
      .order('created_at', { ascending: false });

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async updateReport(reportId: string, updates: any) {
    const { data, error } = await this.supabase
      .from('reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCompanySettings() {
    const { data, error } = await this.supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket: string, path: string) {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) throw error;
    return data;
  }

  // ---------------------------------------------------------------------------
  // MISSIONS
  // ---------------------------------------------------------------------------

  async getMission(missionId: string) {
    const { data, error } = await this.supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (error) throw error;
    return data;
  }

  async getMissions(filters?: { status?: string; workerId?: string }) {
    let query = this.supabase
      .from('missions')
      .select('*')
      .order('appointment_time', { ascending: true });

    if (filters?.status) {
      const statuses = filters.status.split(',').map((s) => s.trim());
      query = query.in('status', statuses);
    }

    if (filters?.workerId) {
      query = query.contains('assigned_workers', [filters.workerId]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createMission(missionData: any) {
    const { data, error } = await this.supabase
      .from('missions')
      .insert(missionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMission(missionId: string, updates: any) {
    const { data, error } = await this.supabase
      .from('missions')
      .update(updates)
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMissionsByDateRange(start: string, end: string, workerId?: string) {
    let query = this.supabase
      .from('missions')
      .select('*')
      .gte('appointment_time', start)
      .lte('appointment_time', end)
      .not('status', 'eq', 'cancelled')
      .order('appointment_time', { ascending: true });

    if (workerId) {
      query = query.contains('assigned_workers', [workerId]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
