import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private clientSupabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Service role client (admin operations)
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Client-side operations (for password verification)
    this.clientSupabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    return this.supabase; // Service role client has admin privileges
  }

  getClientSupabase(): SupabaseClient {
    return this.clientSupabase; // Client-side operations
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
    
    // Get mission data associated with this report
    if (data) {
      const { data: missionData, error: missionError } = await this.supabase
        .from('missions')
        .select('mission_type, mission_subtypes, appointment_time, started_at, completed_at, surface_area, additional_info')
        .eq('report_id', reportId)
        .single();
        
      if (!missionError && missionData) {
        // Merge mission data into report data
        data.mission_type = missionData.mission_type;
        data.mission_subtypes = missionData.mission_subtypes;
        data.appointment_time = missionData.appointment_time;
        data.started_at = missionData.started_at;
        data.surface_area = missionData.surface_area;
        data.additional_info = missionData.additional_info;
      }
    }
    
    // Transform pdf_url: if it's an empty JSON object string or invalid, set to null
    if (data && data.pdf_url) {
      try {
        // Check if pdf_url is a JSON string like "{}"
        if (data.pdf_url === '{}' || data.pdf_url === 'null' || data.pdf_url === '') {
          data.pdf_url = null;
        } else if (data.pdf_url.startsWith('{')) {
          // Try to parse as JSON
          const parsed = JSON.parse(data.pdf_url);
          // If it's an empty object, set to null
          if (Object.keys(parsed).length === 0) {
            data.pdf_url = null;
          }
        }
        // If pdf_url exists and is not a full URL, construct it
        else if (data.pdf_url && !data.pdf_url.startsWith('http')) {
          data.pdf_url = this.getPublicUrl('roof-photos', data.pdf_url);
        }
      } catch (e) {
        // If parsing fails, keep the original value or set to null if it looks like invalid JSON
        if (data.pdf_url.startsWith('{') || data.pdf_url === '{}') {
          data.pdf_url = null;
        }
      }
    }
    
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
      .order('created_at', { ascending: false});

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Transform pdf_url for each report
    if (data && Array.isArray(data)) {
      data.forEach((report) => {
        if (report.pdf_url) {
          try {
            // Check if pdf_url is a JSON string like "{}"
            if (report.pdf_url === '{}' || report.pdf_url === 'null' || report.pdf_url === '') {
              report.pdf_url = null;
            } else if (report.pdf_url.startsWith('{')) {
              // Try to parse as JSON
              const parsed = JSON.parse(report.pdf_url);
              // If it's an empty object, set to null
              if (Object.keys(parsed).length === 0) {
                report.pdf_url = null;
              }
            }
            // If pdf_url exists and is not a full URL, construct it
            else if (report.pdf_url && !report.pdf_url.startsWith('http')) {
              report.pdf_url = this.getPublicUrl('roof-photos', report.pdf_url);
            }
          } catch (e) {
            // If parsing fails, keep the original value or set to null if it looks like invalid JSON
            if (report.pdf_url.startsWith('{') || report.pdf_url === '{}') {
              report.pdf_url = null;
            }
          }
        }
      });
    }
    
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
