import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Inventaire (lot 4 — Ali, modèle onglet Stock de l'app ACC) :
 * les ouvriers déclarent les produits utilisés en fin de chantier → déduits
 * du stock ; alerte quand quantity <= threshold ; réappro par l'admin.
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async listItems() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('category')
      .order('label');
    if (error) throw new BadRequestException(`Failed to list stock: ${error.message}`);
    return (data ?? []).map((i) => ({ ...i, low: Number(i.quantity) <= Number(i.threshold) }));
  }

  /** delta < 0 = consommation (ouvrier), delta > 0 = réappro (admin). */
  async move(itemId: string, delta: number, userId: string, missionId?: string, note?: string) {
    if (!delta || !Number.isFinite(delta)) {
      throw new BadRequestException('delta must be a non-zero number');
    }
    const supabase = this.supabaseService.getClient();

    const { data: item, error: itemError } = await supabase
      .from('stock_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (itemError || !item) throw new NotFoundException(`Stock item "${itemId}" not found`);

    const newQuantity = Number(item.quantity) + delta;
    if (newQuantity < 0) {
      throw new BadRequestException(
        `Not enough stock for "${item.label}": ${item.quantity} ${item.unit} left, tried to use ${-delta}.`,
      );
    }

    const { error: movError } = await supabase.from('stock_movements').insert({
      item_id: itemId,
      delta,
      mission_id: missionId ?? null,
      user_id: userId,
      note: note ?? null,
    });
    if (movError) throw new BadRequestException(`Failed to record movement: ${movError.message}`);

    const { data: updated, error: updError } = await supabase
      .from('stock_items')
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (updError) throw new BadRequestException(`Failed to update stock: ${updError.message}`);

    this.logger.log(`📦 Stock ${itemId}: ${delta > 0 ? '+' : ''}${delta} → ${newQuantity}`);
    return { ...updated, low: Number(updated.quantity) <= Number(updated.threshold) };
  }

  async updateItem(itemId: string, patch: { quantity?: number; threshold?: number }) {
    const supabase = this.supabaseService.getClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.quantity !== undefined) update.quantity = patch.quantity;
    if (patch.threshold !== undefined) update.threshold = patch.threshold;
    const { data, error } = await supabase
      .from('stock_items')
      .update(update)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw new BadRequestException(`Failed to update item: ${error.message}`);
    return data;
  }

  async listMovements(itemId?: string, limit = 50) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('stock_movements')
      .select('*, stock_items(label), users(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (itemId) query = query.eq('item_id', itemId);
    const { data, error } = await query;
    if (error) throw new BadRequestException(`Failed to list movements: ${error.message}`);
    return data;
  }
}
