import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Compteur de paie (lot 4 — Ali, modèle onglet Salaire de l'app ACC) :
 * un montant par jour et par ouvrier, choisi librement par l'admin
 * (100-300 € selon le jour/chantier), cumul mensuel, marquage payé.
 */
@Injectable()
export class SalaryService {
  private readonly logger = new Logger(SalaryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** month = 'YYYY-MM' (défaut : mois courant, Europe/Brussels). */
  async monthForWorker(workerId: string, month?: string) {
    const m =
      month && /^\d{4}-\d{2}$/.test(month)
        ? month
        : new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' }).slice(0, 7);
    const from = `${m}-01`;
    const [y, mm] = m.split('-').map(Number);
    const to = `${mm === 12 ? y + 1 : y}-${String(mm === 12 ? 1 : mm + 1).padStart(2, '0')}-01`;

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_days')
      .select('*')
      .eq('worker_id', workerId)
      .gte('work_date', from)
      .lt('work_date', to)
      .order('work_date', { ascending: false });
    if (error) throw new BadRequestException(`Failed to fetch salary: ${error.message}`);

    const days = data ?? [];
    const total = days.reduce((s, d) => s + Number(d.amount), 0);
    const unpaid = days.filter((d) => !d.paid).reduce((s, d) => s + Number(d.amount), 0);
    return { month: m, days, total, unpaid, days_worked: days.length };
  }

  async addDay(
    dto: { worker_id: string; work_date: string; amount: number; note?: string },
    adminId: string,
  ) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('work_days')
      .insert({
        worker_id: dto.worker_id,
        work_date: dto.work_date,
        amount: dto.amount,
        note: dto.note ?? null,
        created_by: adminId,
      })
      .select()
      .single();
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        throw new BadRequestException(
          `A day already exists for this worker on ${dto.work_date} — modify it instead.`,
        );
      }
      throw new BadRequestException(`Failed to add work day: ${error.message}`);
    }
    this.logger.log(`💰 Work day added: ${dto.worker_id} ${dto.work_date} ${dto.amount} €`);
    return data;
  }

  async updateDay(id: string, patch: { amount?: number; note?: string; paid?: boolean }) {
    const supabase = this.supabaseService.getClient();
    const update: Record<string, unknown> = {};
    if (patch.amount !== undefined) update.amount = patch.amount;
    if (patch.note !== undefined) update.note = patch.note;
    if (patch.paid !== undefined) {
      update.paid = patch.paid;
      update.paid_at = patch.paid ? new Date().toISOString() : null;
    }
    if (Object.keys(update).length === 0) throw new BadRequestException('Nothing to update');

    const { data, error } = await supabase
      .from('work_days')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(`Failed to update work day: ${error.message}`);
    return data;
  }

  async deleteDay(id: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.from('work_days').delete().eq('id', id);
    if (error) throw new BadRequestException(`Failed to delete work day: ${error.message}`);
    return { deleted: true };
  }

  /** Marque tout le mois d'un ouvrier comme payé (fin de mois). */
  async markMonthPaid(workerId: string, month: string) {
    const { days } = await this.monthForWorker(workerId, month);
    const supabase = this.supabaseService.getClient();
    const ids = days.filter((d) => !d.paid).map((d) => d.id);
    if (ids.length === 0) return { paid: 0 };
    const { error } = await supabase
      .from('work_days')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .in('id', ids);
    if (error) throw new BadRequestException(`Failed to mark month paid: ${error.message}`);
    return { paid: ids.length };
  }
}
