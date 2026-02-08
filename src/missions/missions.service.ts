import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { AssignWorkersDto } from './dto/assign-workers.dto';
import { RescheduleMissionDto } from './dto/reschedule-mission.dto';

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  async createMission(dto: CreateMissionDto, createdByUserId: string) {
    const supabase = this.supabaseService.getClient();

    const insertData: any = {
      created_by: createdByUserId,
      client_first_name: dto.client_first_name,
      client_last_name: dto.client_last_name,
      client_phone: dto.client_phone,
      client_email: dto.client_email || null,
      client_address: dto.client_address,
      client_latitude: dto.client_latitude || null,
      client_longitude: dto.client_longitude || null,
      appointment_time: dto.appointment_time,
      mission_type: dto.mission_type || 'roof',
      mission_subtypes: dto.mission_subtypes,
      surface_area: dto.surface_area || null,
      facade_count: dto.facade_count || 1,
      additional_info: dto.additional_info || null,
      features: dto.features || {},
      status: 'created',
    };

    // If workers are provided at creation, mark as assigned immediately
    if (dto.assigned_workers && dto.assigned_workers.length > 0) {
      insertData.assigned_workers = dto.assigned_workers;
      insertData.status = 'assigned';
    }

    const { data, error } = await supabase
      .from('missions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create mission: ${error.message}`);
      throw new BadRequestException(`Failed to create mission: ${error.message}`);
    }

    // Send notifications to assigned workers
    if (data.status === 'assigned' && data.assigned_workers?.length > 0) {
      await this.notifyWorkersAssigned(data);
    }

    this.logger.log(`Mission ${data.id} created by ${createdByUserId}`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // LIST
  // ---------------------------------------------------------------------------
  async getMissions(user: { id: string; role: string }, status?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('missions')
      .select('*')
      .order('appointment_time', { ascending: true });

    // Workers only see their own missions
    if (user.role !== 'admin') {
      query = query.contains('assigned_workers', [user.id]);
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      query = query.in('status', statuses);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch missions: ${error.message}`);
      throw new BadRequestException(`Failed to fetch missions: ${error.message}`);
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------
  async getMission(missionId: string, user: { id: string; role: string }) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Mission ${missionId} not found`);
    }

    // Workers can only view their own assigned missions
    if (user.role !== 'admin' && !data.assigned_workers?.includes(user.id)) {
      throw new ForbiddenException('You are not assigned to this mission');
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // UPDATE (admin)
  // ---------------------------------------------------------------------------
  async updateMission(missionId: string, dto: UpdateMissionDto) {
    const supabase = this.supabaseService.getClient();

    // Verify mission exists
    await this.getMissionRaw(missionId);

    const { data, error } = await supabase
      .from('missions')
      .update(dto as any)
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update mission: ${error.message}`);
    }

    this.logger.log(`Mission ${missionId} updated`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // DELETE / CANCEL
  // ---------------------------------------------------------------------------
  async cancelMission(missionId: string) {
    const mission = await this.getMissionRaw(missionId);

    if (mission.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed mission');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to cancel mission: ${error.message}`);
    }

    // Notify assigned workers about cancellation
    if (data.assigned_workers?.length > 0) {
      for (const workerId of data.assigned_workers) {
        await this.notificationsService.createAndSendNotification(
          workerId,
          'Mission Cancelled',
          `Mission for ${data.client_first_name} ${data.client_last_name} at ${data.client_address} has been cancelled.`,
          'mission_cancelled',
          missionId,
        );
      }

      // Send cancellation email to workers
      await this.emailService.sendMissionCancelledEmail(data);
    }

    this.logger.log(`Mission ${missionId} cancelled`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // ASSIGN WORKERS
  // ---------------------------------------------------------------------------
  async assignWorkers(missionId: string, dto: AssignWorkersDto) {
    const mission = await this.getMissionRaw(missionId);

    if (mission.status === 'completed' || mission.status === 'cancelled') {
      throw new BadRequestException(`Cannot assign workers to a ${mission.status} mission`);
    }

    const supabase = this.supabaseService.getClient();

    // Verify all worker IDs exist
    const { data: workers, error: workersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', dto.worker_ids)
      .eq('role', 'worker');

    if (workersError) {
      throw new BadRequestException(`Failed to verify workers: ${workersError.message}`);
    }

    if (workers.length !== dto.worker_ids.length) {
      throw new BadRequestException('One or more worker IDs are invalid');
    }

    const newStatus = mission.status === 'created' ? 'assigned' : mission.status;

    const { data, error } = await supabase
      .from('missions')
      .update({
        assigned_workers: dto.worker_ids,
        status: newStatus,
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to assign workers: ${error.message}`);
    }

    // Notify newly assigned workers
    await this.notifyWorkersAssigned(data);

    this.logger.log(`Workers ${dto.worker_ids.join(', ')} assigned to mission ${missionId}`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // START MISSION (worker)
  // ---------------------------------------------------------------------------
  async startMission(missionId: string, userId: string) {
    const mission = await this.getMissionRaw(missionId);

    this.assertWorkerIsAssigned(mission, userId);

    if (mission.status !== 'assigned') {
      throw new BadRequestException(
        `Cannot start mission with status "${mission.status}". Expected "assigned".`,
      );
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('missions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to start mission: ${error.message}`);
    }

    this.logger.log(`Mission ${missionId} started by worker ${userId}`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // BEFORE PICTURES — transitions to waiting_completion + starts 10-min timer
  // ---------------------------------------------------------------------------
  async submitBeforePictures(
    missionId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    const mission = await this.getMissionRaw(missionId);

    this.assertWorkerIsAssigned(mission, userId);

    if (mission.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot submit before-pictures for mission with status "${mission.status}". Expected "in_progress".`,
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one before-picture is required');
    }

    // Upload photos to Supabase storage
    const photoUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storagePath = `missions/${missionId}/before/${Date.now()}_${i}.${file.originalname.split('.').pop() || 'jpg'}`;
      await this.supabaseService.uploadFile('roof-photos', storagePath, file.buffer, file.mimetype);
      const publicUrl = await this.supabaseService.getPublicUrl('roof-photos', storagePath);
      photoUrls.push(publicUrl);
    }

    // Set the 10-minute timer
    const now = new Date();
    const completionUnlockedAt = new Date(now.getTime() + 10 * 60 * 1000); // +10 minutes

    const supabase = this.supabaseService.getClient();

    // Create pre-report in reports table
    const { data: preReport, error: reportError } = await supabase
      .from('reports')
      .insert({
        worker_id: userId,
        client_first_name: mission.client_first_name,
        client_last_name: mission.client_last_name,
        client_address: mission.client_address,
        client_phone: mission.client_phone,
        status: 'draft',
      })
      .select()
      .single();

    if (reportError) {
      this.logger.error(`Failed to create pre-report: ${reportError.message}`);
    }

    // Insert photos into photos table (linked to pre-report)
    if (preReport) {
      for (let i = 0; i < photoUrls.length; i++) {
        const storagePath = `missions/${missionId}/before/${Date.now()}_${i}.jpg`;
        await supabase.from('photos').insert({
          report_id: preReport.id,
          type: 'before',
          storage_path: storagePath,
          order: i + 1,
        });
      }
    }

    // Update mission status
    const updateData: any = {
      status: 'waiting_completion',
      before_pictures_submitted_at: now.toISOString(),
      completion_unlocked_at: completionUnlockedAt.toISOString(),
    };

    if (preReport) {
      updateData.pre_report_id = preReport.id;
    }

    const { data, error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update mission: ${error.message}`);
    }

    // Notify admins about pre-report
    await this.notifyAdminsPreReport(data);

    this.logger.log(
      `Mission ${missionId}: before-pictures submitted. Completion unlocked at ${completionUnlockedAt.toISOString()}`,
    );

    return {
      mission: data,
      before_pictures: photoUrls,
      pre_report_id: preReport?.id || null,
      completion_unlocked_at: completionUnlockedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // COMPLETE MISSION — worker submits after-pictures + signatures
  // ---------------------------------------------------------------------------
  async completeMission(
    missionId: string,
    userId: string,
    files: Express.Multer.File[],
    workerSignature?: Express.Multer.File,
    clientSignature?: Express.Multer.File,
  ) {
    const mission = await this.getMissionRaw(missionId);

    this.assertWorkerIsAssigned(mission, userId);

    if (mission.status !== 'waiting_completion') {
      throw new BadRequestException(
        `Cannot complete mission with status "${mission.status}". Expected "waiting_completion".`,
      );
    }

    // Check 10-minute timer
    if (mission.completion_unlocked_at) {
      const unlockTime = new Date(mission.completion_unlocked_at);
      if (new Date() < unlockTime) {
        const remainingMs = unlockTime.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        throw new BadRequestException(
          `Mission completion is locked for ${remainingMin} more minute(s). Please wait until the minimum work time has elapsed.`,
        );
      }
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one after-picture is required');
    }

    // Upload after-pictures
    const afterPhotoUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storagePath = `missions/${missionId}/after/${Date.now()}_${i}.${file.originalname.split('.').pop() || 'jpg'}`;
      await this.supabaseService.uploadFile('roof-photos', storagePath, file.buffer, file.mimetype);
      const publicUrl = await this.supabaseService.getPublicUrl('roof-photos', storagePath);
      afterPhotoUrls.push(publicUrl);
    }

    // Upload signatures
    let workerSignatureUrl: string | null = null;
    let clientSignatureUrl: string | null = null;

    if (workerSignature) {
      const sigPath = `missions/${missionId}/signatures/worker.png`;
      await this.supabaseService.uploadFile('signatures', sigPath, workerSignature.buffer, workerSignature.mimetype);
      workerSignatureUrl = await this.supabaseService.getPublicUrl('signatures', sigPath);
    }

    if (clientSignature) {
      const sigPath = `missions/${missionId}/signatures/client.png`;
      await this.supabaseService.uploadFile('signatures', sigPath, clientSignature.buffer, clientSignature.mimetype);
      clientSignatureUrl = await this.supabaseService.getPublicUrl('signatures', sigPath);
    }

    const supabase = this.supabaseService.getClient();

    // Create final report
    const { data: finalReport, error: reportError } = await supabase
      .from('reports')
      .insert({
        worker_id: userId,
        client_first_name: mission.client_first_name,
        client_last_name: mission.client_last_name,
        client_address: mission.client_address,
        client_phone: mission.client_phone,
        worker_signature_url: workerSignatureUrl,
        client_signature_url: clientSignatureUrl,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reportError) {
      this.logger.error(`Failed to create final report: ${reportError.message}`);
    }

    // Insert after-photos linked to final report
    if (finalReport) {
      for (let i = 0; i < afterPhotoUrls.length; i++) {
        const storagePath = `missions/${missionId}/after/${Date.now()}_${i}.jpg`;
        await supabase.from('photos').insert({
          report_id: finalReport.id,
          type: 'after',
          storage_path: storagePath,
          order: i + 1,
        });
      }
    }

    // Update mission status to completed
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    if (finalReport) {
      updateData.final_report_id = finalReport.id;
    }

    const { data, error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to complete mission: ${error.message}`);
    }

    // Notify admins + worker about completion
    await this.notifyMissionCompleted(data);

    this.logger.log(`Mission ${missionId} completed by worker ${userId}`);

    return {
      mission: data,
      after_pictures: afterPhotoUrls,
      final_report_id: finalReport?.id || null,
      worker_signature_url: workerSignatureUrl,
      client_signature_url: clientSignatureUrl,
    };
  }

  // ---------------------------------------------------------------------------
  // CALENDAR — date range query
  // ---------------------------------------------------------------------------
  async getMissionsByDateRange(
    user: { id: string; role: string },
    start: string,
    end: string,
  ) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('missions')
      .select('*')
      .gte('appointment_time', start)
      .lte('appointment_time', end)
      .not('status', 'eq', 'cancelled')
      .order('appointment_time', { ascending: true });

    // Workers only see their own missions
    if (user.role !== 'admin') {
      query = query.contains('assigned_workers', [user.id]);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch calendar missions: ${error.message}`);
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // RESCHEDULE (admin)
  // ---------------------------------------------------------------------------
  async rescheduleMission(missionId: string, dto: RescheduleMissionDto) {
    const mission = await this.getMissionRaw(missionId);

    if (mission.status === 'completed' || mission.status === 'cancelled') {
      throw new BadRequestException(`Cannot reschedule a ${mission.status} mission`);
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('missions')
      .update({ appointment_time: dto.appointment_time })
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to reschedule mission: ${error.message}`);
    }

    // Notify assigned workers
    if (data.assigned_workers?.length > 0) {
      for (const workerId of data.assigned_workers) {
        await this.notificationsService.createAndSendNotification(
          workerId,
          'Mission Rescheduled',
          `Mission for ${data.client_first_name} ${data.client_last_name} has been rescheduled to ${new Date(dto.appointment_time).toLocaleString()}.`,
          'mission_rescheduled',
          missionId,
        );
      }
    }

    this.logger.log(`Mission ${missionId} rescheduled to ${dto.appointment_time}`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async getMissionRaw(missionId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Mission ${missionId} not found`);
    }

    return data;
  }

  private assertWorkerIsAssigned(mission: any, userId: string) {
    if (!mission.assigned_workers?.includes(userId)) {
      throw new ForbiddenException('You are not assigned to this mission');
    }
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION HELPERS
  // ---------------------------------------------------------------------------

  private async notifyWorkersAssigned(mission: any) {
    if (!mission.assigned_workers?.length) return;

    for (const workerId of mission.assigned_workers) {
      await this.notificationsService.createAndSendNotification(
        workerId,
        'New Mission Assigned',
        `You have been assigned a mission for ${mission.client_first_name} ${mission.client_last_name} at ${mission.client_address} on ${new Date(mission.appointment_time).toLocaleString()}.`,
        'mission_assigned',
        mission.id,
      );
    }

    // Send assignment email
    await this.emailService.sendMissionAssignedEmail(mission);
  }

  private async notifyAdminsPreReport(mission: any) {
    const supabase = this.supabaseService.getClient();

    // Find all admins
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        await this.notificationsService.createAndSendNotification(
          admin.id,
          'Pre-Report Submitted',
          `Before-pictures submitted for mission at ${mission.client_address}. 10-minute timer started.`,
          'pre_report',
          mission.id,
        );
      }
    }

    // Send pre-report email to admins
    await this.emailService.sendPreReportEmail(mission);
  }

  private async notifyMissionCompleted(mission: any) {
    const supabase = this.supabaseService.getClient();

    // Notify admins
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        await this.notificationsService.createAndSendNotification(
          admin.id,
          'Mission Completed',
          `Mission at ${mission.client_address} has been completed. Final report is ready.`,
          'mission_completed',
          mission.id,
        );
      }
    }

    // Notify assigned workers
    if (mission.assigned_workers?.length > 0) {
      for (const workerId of mission.assigned_workers) {
        await this.notificationsService.createAndSendNotification(
          workerId,
          'Mission Completed',
          `Mission at ${mission.client_address} has been marked as completed.`,
          'mission_completed',
          mission.id,
        );
      }
    }

    // Send completion email
    await this.emailService.sendMissionCompletedEmail(mission);
  }
}
