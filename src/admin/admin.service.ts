import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private supabaseService: SupabaseService) {}

  async getStatistics(startDate?: string, endDate?: string) {
    const supabase = this.supabaseService.getClient();

    // Get total reports
    let reportsQuery = supabase.from('reports').select('*', { count: 'exact', head: true });
    
    if (startDate) {
      reportsQuery = reportsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      reportsQuery = reportsQuery.lte('created_at', endDate);
    }

    const { count: totalReports } = await reportsQuery;

    // Get reports by status
    const { data: reportsByStatus } = await supabase
      .from('reports')
      .select('status')
      .then(({ data }) => {
        const statusCount = data?.reduce((acc, report) => {
          acc[report.status] = (acc[report.status] || 0) + 1;
          return acc;
        }, {});
        return { data: statusCount };
      });

    // Get reports by worker
    const { data: reportsByWorker } = await supabase
      .from('reports')
      .select(`
        worker_id,
        worker:users!worker_id(first_name, last_name)
      `)
      .then(({ data }) => {
        const workerStats = {};
        data?.forEach((report) => {
          const workerId = report.worker_id;
          if (!workerStats[workerId]) {
            workerStats[workerId] = {
              worker: report.worker,
              count: 0,
            };
          }
          workerStats[workerId].count++;
        });
        return { data: Object.values(workerStats) };
      });

    // Get reports per month (last 12 months)
    const { data: reportsPerMonth } = await supabase
      .from('reports')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data }) => {
        const monthlyStats = {};
        data?.forEach((report) => {
          const month = new Date(report.created_at).toISOString().slice(0, 7);
          monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        });
        return {
          data: Object.entries(monthlyStats).map(([month, count]) => ({
            month,
            count,
          })),
        };
      });

    // Get active workers count
    const { count: activeWorkers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'worker')
      .eq('is_active', true);

    return {
      totalReports,
      reportsByStatus,
      reportsByWorker,
      reportsPerMonth,
      activeWorkers,
    };
  }

  async getReportsByWorker(workerId: string) {
    return await this.supabaseService.getReports(workerId);
  }

  async getCompany() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('company_settings')
      .select('company_name, company_email, company_phone, iban')
      .limit(1)
      .single();
    if (error) throw error;
    return data;
  }

  async getWorkers() {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, is_active, created_at')
      .eq('role', 'worker')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
