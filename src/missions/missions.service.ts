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
import { EQUIPMENT_CATALOG } from './equipment.catalog';
import { CLOSURE_CHECKLIST_IDS, FUEL_EQUIPMENT, FUEL_LEVELS, FuelState } from './closure.catalog';
import { ServiceLoggerService } from '../common/services/service-logger.service';
import { ReportsService } from '../reports/reports.service';
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
    private readonly reportsService: ReportsService,
    private readonly serviceLogger: ServiceLoggerService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  async createMission(dto: CreateMissionDto, createdByUserId: string) {
    const timer = this.serviceLogger.startTimer();
    const user = { id: createdByUserId, role: 'admin' }; // Creator is typically admin

    try {
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
        equipment: dto.equipment || [],
        status: 'assigned',
      };

      await this.assertNoEquipmentConflict(dto.appointment_time, dto.equipment);

      // Attach assigned workers if provided
      if (dto.assigned_workers && dto.assigned_workers.length > 0) {
        insertData.assigned_workers = dto.assigned_workers;
      }

      const { data, error } = await supabase
        .from('missions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create mission: ${error.message}`);
        const err = new BadRequestException(`Failed to create mission: ${error.message}`);
        this.serviceLogger.logCreate('MissionsService', 'mission', dto, null, user, timer(), err);
        throw err;
      }

      // Send notifications to assigned workers
      if (data.status === 'assigned' && data.assigned_workers?.length > 0) {
        await this.notifyWorkersAssigned(data);
      }

      this.logger.log(`Mission ${data.id} created by ${createdByUserId}`);
      
      // Log successful creation
      this.serviceLogger.logCreate('MissionsService', 'mission', dto, data, user, timer());
      
      return data;
    } catch (error) {
      // Log any unexpected errors
      if (!(error instanceof BadRequestException)) {
        this.serviceLogger.logCreate('MissionsService', 'mission', dto, null, user, timer(), error as Error);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // LIST
  // ---------------------------------------------------------------------------
  async getMissions(user: { id: string; role: string }, status?: string) {
    const timer = this.serviceLogger.startTimer();
    const filters = { status, userRole: user.role };

    try {
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
        const err = new BadRequestException(`Failed to fetch missions: ${error.message}`);
        this.serviceLogger.logList('MissionsService', 'missions', filters, 0, user, timer(), err);
        throw err;
      }

      // Enrich with worker details
      const enrichedData = await this.enrichMissionsWithWorkers(data);
      
      // Log successful operation
      this.serviceLogger.logList('MissionsService', 'missions', filters, enrichedData.length, user, timer());
      
      return enrichedData;
    } catch (error) {
      // Log any unexpected errors
      if (!(error instanceof BadRequestException)) {
        this.serviceLogger.logList('MissionsService', 'missions', filters, 0, user, timer(), error as Error);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------
  async getMission(missionId: string, user: { id: string; role: string }) {
    const timer = this.serviceLogger.startTimer();

    try {
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (error || !data) {
        const err = new NotFoundException(`Mission ${missionId} not found`);
        this.serviceLogger.logRead('MissionsService', 'mission', missionId, null, user, timer(), err);
        throw err;
      }

      // Workers can only view their own assigned missions
      if (user.role !== 'admin' && !data.assigned_workers?.includes(user.id)) {
        const err = new ForbiddenException('You are not assigned to this mission');
        this.serviceLogger.logRead('MissionsService', 'mission', missionId, null, user, timer(), err);
        throw err;
      }

      // Enrich with worker details
      const [enriched] = await this.enrichMissionsWithWorkers([data]);
      
      // Log successful read
      this.serviceLogger.logRead('MissionsService', 'mission', missionId, enriched, user, timer());
      
      return enriched;
    } catch (error) {
      // Log any unexpected errors
      if (!(error instanceof NotFoundException) && !(error instanceof ForbiddenException)) {
        this.serviceLogger.logRead('MissionsService', 'mission', missionId, null, user, timer(), error as Error);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // ENRICH MISSIONS WITH WORKER DETAILS
  // ---------------------------------------------------------------------------
  private async enrichMissionsWithWorkers(missions: any[]): Promise<any[]> {
    if (!missions || missions.length === 0) return missions;

    const supabase = this.supabaseService.getClient();

    // Collect all unique worker IDs
    const allWorkerIds = new Set<string>();
    missions.forEach((m) => {
      if (m.assigned_workers?.length) {
        m.assigned_workers.forEach((id: string) => allWorkerIds.add(id));
      }
    });

    // Fetch worker details
    let workerMap = new Map<string, any>();
    if (allWorkerIds.size > 0) {
      const { data: workers } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, profile_picture_url')
        .in('id', Array.from(allWorkerIds));

      (workers || []).forEach((w) => workerMap.set(w.id, w));
    }

    // Fetch photos for all missions via reports
    const missionIds = missions.map(m => m.id);
    this.logger.log(`🔍 Fetching photos for ${missionIds.length} missions`);
    
    // Collect all report IDs from missions
    const reportIds = missions.map(m => m.report_id).filter(Boolean);
    
    this.logger.log(`📋 Found ${reportIds.length} reports`);
    
    // Get photos for these reports
    let reports: any[] = [];
    if (reportIds.length > 0) {
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          status,
          photos!inner(storage_path, url, type, order)
        `)
        .in('id', reportIds);

      if (reportsError) {
        this.logger.error(`❌ Failed to fetch reports: ${reportsError.message}`);
      } else {
        reports = reportsData || [];
        this.logger.log(`📊 Loaded ${reports.length} reports with photos`);
      }
    }

    // Create a map from mission to photos via report IDs
    const photosMap = new Map<string, { before: string[], after: string[] }>();
    
    // Initialize empty arrays for all missions
    missionIds.forEach(missionId => {
      photosMap.set(missionId, { before: [], after: [] });
    });
    
    // Map photos to missions through reports
    await Promise.all(missions.map(async mission => {
      const photoGroup = photosMap.get(mission.id)!;
      
      // Get both before and after photos from single report
      if (mission.report_id) {
        const report = reports.find(r => r.id === mission.report_id);
        if (report?.photos) {
          // Get before photos
          const beforePhotos = report.photos
            .filter((p: any) => p.type === 'before')
            .sort((a: any, b: any) => a.order - b.order)
            .map((p: any) => p.url || this.supabaseService.getPublicUrl('roof-photos', p.storage_path));
          
          // Resolve any promises (for fallback URLs)
          const resolvedBeforePhotos = await Promise.all(beforePhotos);
          photoGroup.before.push(...resolvedBeforePhotos);
          this.logger.log(`📸 Mission ${mission.id}: Found ${resolvedBeforePhotos.length} before photos`);
          
          // Get after photos
          const afterPhotos = report.photos
            .filter((p: any) => p.type === 'after')
            .sort((a: any, b: any) => a.order - b.order)
            .map((p: any) => p.url || this.supabaseService.getPublicUrl('roof-photos', p.storage_path));
          
          // Resolve any promises (for fallback URLs)
          const resolvedAfterPhotos = await Promise.all(afterPhotos);
          photoGroup.after.push(...resolvedAfterPhotos);
          this.logger.log(`📸 Mission ${mission.id}: Found ${resolvedAfterPhotos.length} after photos`);
        }
      }
    }));
    
    const missionsWithPhotos = Array.from(photosMap.values()).filter(p => p.before.length > 0 || p.after.length > 0).length;
    this.logger.log(`📸 Total missions with photos: ${missionsWithPhotos}/${missionIds.length}`);

    return missions.map((mission) => {
      const missionPhotos = photosMap.get(mission.id) || { before: [], after: [] };
      
      return {
        ...mission,
        assigned_workers_details: (mission.assigned_workers || [])
          .map((id: string) => workerMap.get(id))
          .filter(Boolean),
        before_pictures: missionPhotos.before,
        after_pictures: missionPhotos.after,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE (admin) — FIX 8: strip status to prevent state machine bypass
  // ---------------------------------------------------------------------------
  async updateMission(missionId: string, dto: UpdateMissionDto) {
    const supabase = this.supabaseService.getClient();

    // Verify mission exists
    const existing = await this.getMissionRaw(missionId);

    // Equipment or date change → re-check machine availability
    if (dto.equipment !== undefined || dto.appointment_time !== undefined) {
      await this.assertNoEquipmentConflict(
        dto.appointment_time ?? existing.appointment_time,
        dto.equipment ?? existing.equipment,
        missionId,
      );
    }

    const updateData: Record<string, any> = { ...dto };

    // If status is being changed, add relevant timestamps
    if (dto.status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    } else if (dto.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (dto.status === 'in_progress' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
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

      // Send cancellation email to actual workers
      const workerEmails = await this.resolveWorkerEmails(data.assigned_workers);
      await this.emailService.sendMissionCancelledEmail(data, workerEmails);
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

    const newStatus = mission.status;

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

    // Notify admins that mission has started
    await this.notifyAdminsMissionStarted(data, userId);

    this.logger.log(`Mission ${missionId} started by worker ${userId}`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // BEFORE PICTURES — transitions to waiting_completion + starts completion timer
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

    // FIX 6: Validate file type and size
    for (const file of files) {
      if (!file.mimetype.startsWith('image/'))
        throw new BadRequestException('Only image files are allowed');
      if (file.size > 10 * 1024 * 1024)
        throw new BadRequestException('Maximum file size is 10MB');
    }

    // Upload photos to Supabase storage
    this.logger.log(`📸 Uploading ${files.length} before-pictures for mission ${missionId}`);
    const photoUrls: string[] = [];
    const storagePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storagePath = `missions/${missionId}/before/${Date.now()}_${i}.${file.originalname.split('.').pop() || 'jpg'}`;
      storagePaths.push(storagePath);
      this.logger.log(`📤 Uploading before-picture ${i+1}/${files.length}: ${storagePath} (${file.size} bytes)`);
      
      try {
        await this.supabaseService.uploadFile('roof-photos', storagePath, file.buffer, file.mimetype);
        const publicUrl = await this.supabaseService.getPublicUrl('roof-photos', storagePath);
        photoUrls.push(publicUrl);
        this.logger.log(`✅ Upload successful: ${publicUrl}`);
      } catch (uploadError: any) {
        this.logger.error(`❌ Upload failed for ${storagePath}: ${uploadError.message}`);
        throw new BadRequestException(`Failed to upload before-picture ${i+1}: ${uploadError.message}`);
      }
    }

    // Set the completion timer (configurable via env)
    const now = new Date();
    const timerSeconds = parseInt(process.env.MISSION_COMPLETION_TIMER_SECONDS || '120', 10);
    const completionUnlockedAt = new Date(now.getTime() + timerSeconds * 1000);

    const supabase = this.supabaseService.getClient();

    // Create or get existing report
    let report = null;
    if (mission.report_id) {
      // If report already exists, fetch it
      const { data: existingReport } = await supabase
        .from('reports')
        .select('*')
        .eq('id', mission.report_id)
        .single();
      report = existingReport;
    } else {
      // Create new report in draft status
      const { data: newReport, error: reportError } = await supabase
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
        this.logger.error(`Failed to create report: ${reportError.message}`);
      }
      report = newReport;
    }

    // Insert photos into photos table (linked to report)
    if (report) {
      this.logger.log(`💾 Saving ${storagePaths.length} before-picture records to database for report ${report.id}`);
      for (let i = 0; i < storagePaths.length; i++) {
        try {
          const { data: photoRecord, error: photoError } = await supabase.from('photos').insert({
            report_id: report.id,
            type: 'before',
            storage_path: storagePaths[i],
            url: photoUrls[i],
            order: i + 1,
          }).select().single();
          
          if (photoError) {
            this.logger.error(`❌ Failed to save before-picture ${i+1} to database: ${photoError.message}`);
            throw new BadRequestException(`Failed to save before-picture ${i+1}: ${photoError.message}`);
          }
          this.logger.log(`✅ Saved before-picture ${i+1} record: ID ${photoRecord.id}`);
        } catch (dbError: any) {
          this.logger.error(`❌ Database error saving before-picture ${i+1}: ${dbError.message}`);
          throw dbError;
        }
      }
    } else {
      this.logger.warn(`⚠️ No report created, skipping photo database records`);
    }

    // Update mission status
    const updateData: any = {
      status: 'waiting_completion',
      before_pictures_submitted_at: now.toISOString(),
      completion_unlocked_at: completionUnlockedAt.toISOString(),
    };

    if (report) {
      updateData.report_id = report.id;
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

    // Notify admins about report submission
    await this.notifyAdminsReportSubmitted(data);

    this.logger.log(
      `Mission ${missionId}: before-pictures submitted. Completion unlocked at ${completionUnlockedAt.toISOString()}`,
    );

    return {
      mission: data,
      before_pictures: photoUrls,
      report_id: report?.id || null,
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
    closure?: {
      materialPhotos: Express.Multer.File[];
      fuelPhoto?: Express.Multer.File;
      closureChecklistRaw?: string;
      fuelStateRaw?: string;
    },
  ) {
    const mission = await this.getMissionRaw(missionId);

    this.assertWorkerIsAssigned(mission, userId);

    // Clôture bloquante (règles d'Ali) : checklist complète + photos matériel
    // + état essence/kilométrage + photo — sinon la mission ne peut pas être clôturée.
    const { checklist, fuelState } = this.validateClosure(mission, closure);

    if (mission.status !== 'waiting_completion') {
      throw new BadRequestException(
        `Cannot complete mission with status "${mission.status}". Expected "waiting_completion".`,
      );
    }

    // Check completion timer
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

    // FIX 6: Validate file type and size
    for (const file of files) {
      if (!file.mimetype.startsWith('image/'))
        throw new BadRequestException('Only image files are allowed');
      if (file.size > 10 * 1024 * 1024)
        throw new BadRequestException('Maximum file size is 10MB');
    }

    // Upload after-pictures
    this.logger.log(`📸 Uploading ${files.length} after-pictures for mission ${missionId}`);
    const afterPhotoUrls: string[] = [];
    const afterStoragePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storagePath = `missions/${missionId}/after/${Date.now()}_${i}.${file.originalname.split('.').pop() || 'jpg'}`;
      afterStoragePaths.push(storagePath);
      this.logger.log(`📤 Uploading after-picture ${i+1}/${files.length}: ${storagePath} (${file.size} bytes)`);
      
      try {
        await this.supabaseService.uploadFile('roof-photos', storagePath, file.buffer, file.mimetype);
        const publicUrl = await this.supabaseService.getPublicUrl('roof-photos', storagePath);
        afterPhotoUrls.push(publicUrl);
        this.logger.log(`✅ Upload successful: ${publicUrl}`);
      } catch (uploadError: any) {
        this.logger.error(`❌ Upload failed for ${storagePath}: ${uploadError.message}`);
        throw new BadRequestException(`Failed to upload after-picture ${i+1}: ${uploadError.message}`);
      }
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

    // Upload closure photos (material cleaned + fuel gauge)
    const closurePhotos: { type: 'material' | 'fuel'; storagePath: string; url: string }[] = [];
    const closureFiles: { type: 'material' | 'fuel'; file: Express.Multer.File }[] = [
      ...(closure?.materialPhotos ?? []).map((file) => ({ type: 'material' as const, file })),
      ...(closure?.fuelPhoto ? [{ type: 'fuel' as const, file: closure.fuelPhoto }] : []),
    ];
    for (let i = 0; i < closureFiles.length; i++) {
      const { type, file } = closureFiles[i];
      if (!file.mimetype.startsWith('image/'))
        throw new BadRequestException('Only image files are allowed');
      if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Maximum file size is 10MB');
      const storagePath = `missions/${missionId}/${type}/${Date.now()}_${i}.${file.originalname.split('.').pop() || 'jpg'}`;
      await this.supabaseService.uploadFile('roof-photos', storagePath, file.buffer, file.mimetype);
      const url = await this.supabaseService.getPublicUrl('roof-photos', storagePath);
      closurePhotos.push({ type, storagePath, url });
    }

    const supabase = this.supabaseService.getClient();

    // Get existing report or create new one
    let report = null;
    if (mission.report_id) {
      // Update existing report with signatures and mark as completed
      const { data: updatedReport, error: updateError } = await supabase
        .from('reports')
        .update({
          worker_signature_url: workerSignatureUrl,
          client_signature_url: clientSignatureUrl,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', mission.report_id)
        .select()
        .single();

      if (updateError) {
        this.logger.error(`Failed to update report: ${updateError.message}`);
      }
      report = updatedReport;
    } else {
      // Create new report if it doesn't exist (edge case)
      const { data: newReport, error: reportError } = await supabase
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
        this.logger.error(`Failed to create report: ${reportError.message}`);
      }
      report = newReport;
    }

    // Insert after-photos linked to report
    if (report) {
      this.logger.log(`💾 Saving ${afterStoragePaths.length} after-picture records to database for report ${report.id}`);
      for (let i = 0; i < afterStoragePaths.length; i++) {
        try {
          const { data: photoRecord, error: photoError } = await supabase.from('photos').insert({
            report_id: report.id,
            type: 'after',
            storage_path: afterStoragePaths[i],
            url: afterPhotoUrls[i],
            order: i + 1,
          }).select().single();
          
          if (photoError) {
            this.logger.error(`❌ Failed to save after-picture ${i+1} to database: ${photoError.message}`);
            throw new BadRequestException(`Failed to save after-picture ${i+1}: ${photoError.message}`);
          }
          this.logger.log(`✅ Saved after-picture ${i+1} record: ID ${photoRecord.id}`);
        } catch (dbError: any) {
          this.logger.error(`❌ Database error saving after-picture ${i+1}: ${dbError.message}`);
          throw dbError;
        }
      }
    } else {
      this.logger.warn(`⚠️ No report available, skipping photo database records`);
    }

    // Insert closure photos (material/fuel) linked to the report
    if (report && closurePhotos.length > 0) {
      for (let i = 0; i < closurePhotos.length; i++) {
        const { type, storagePath, url } = closurePhotos[i];
        const { error: photoError } = await supabase.from('photos').insert({
          report_id: report.id,
          type,
          storage_path: storagePath,
          url,
          order: i + 1,
        });
        if (photoError) {
          this.logger.error(`❌ Failed to save ${type} photo: ${photoError.message}`);
        }
      }
    }

    // Update mission status to completed
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      closure_checklist: checklist,
      fuel_state: fuelState,
    };

    if (report) {
      updateData.report_id = report.id;
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

    // Generate PDF and send report email via ReportsService
    let pdfBuffer: Buffer | undefined;
    let pdfUrl: string | null = null;
    if (report) {
      try {
        const result = await this.reportsService.generateAndSendReport(report.id);
        pdfBuffer = result.pdfBuffer;
        pdfUrl = result.pdfUrl;
        this.logger.log(`PDF generated and sent for report ${report.id}, URL: ${pdfUrl}`);
      } catch (pdfError: any) {
        this.logger.error(`Failed to generate/send PDF for report ${report.id}: ${pdfError.message}`);
        // Don't fail the mission completion if PDF generation fails — it can be retried
      }
    }

    // Notify admins + worker about completion (with PDF attachment)
    await this.notifyMissionCompleted(data, pdfBuffer);

    this.logger.log(`Mission ${missionId} completed by worker ${userId}`);

    return {
      mission: data,
      after_pictures: afterPhotoUrls,
      report_id: report?.id || null,
      worker_signature_url: workerSignatureUrl,
      client_signature_url: clientSignatureUrl,
      pdf_url: pdfUrl,
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

    return this.enrichMissionsWithWorkers(data);
  }

  // ---------------------------------------------------------------------------
  // PAYMENT (admin) — Lot 3 : enregistre le paiement et envoie le bon
  // d'exécution (PDF du rapport) au client. Règle d'Ali : le bon part au
  // paiement, jamais à la signature/complétion.
  // ---------------------------------------------------------------------------
  async recordPayment(
    missionId: string,
    dto: { method: string; amount?: number },
    adminUserId: string,
  ) {
    const mission = await this.getMissionRaw(missionId);

    if (mission.status !== 'completed') {
      throw new BadRequestException(
        `Cannot record payment for a "${mission.status}" mission — it must be completed first.`,
      );
    }
    if (mission.payment) {
      throw new BadRequestException(
        `Payment already recorded on ${mission.payment.received_at} (${mission.payment.method}).`,
      );
    }

    const payment = {
      method: dto.method,
      amount: dto.amount ?? null,
      received_at: new Date().toISOString(),
      recorded_by: adminUserId,
    };

    // Envoi du bon d'exécution au client (PDF déjà généré à la complétion)
    let bonSentAt: string | null = null;
    let bonWarning: string | null = null;
    if (!mission.client_email) {
      bonWarning = 'No client email on the mission — payment recorded but no bon sent.';
    } else if (!mission.report_id) {
      bonWarning = 'No report linked to the mission — payment recorded but no bon sent.';
    } else {
      const supabase = this.supabaseService.getClient();
      const { data: report } = await supabase
        .from('reports')
        .select('id, pdf_url')
        .eq('id', mission.report_id)
        .single();

      if (!report?.pdf_url) {
        bonWarning = 'Report PDF not available — payment recorded but no bon sent.';
      } else {
        const res = await fetch(report.pdf_url);
        if (!res.ok) {
          bonWarning = `Could not download report PDF (${res.status}) — payment recorded but no bon sent.`;
        } else {
          const pdfBuffer = Buffer.from(await res.arrayBuffer());
          await this.emailService.sendReportEmail({
            to: mission.client_email,
            clientName: `${mission.client_first_name} ${mission.client_last_name}`,
            reportId: report.id,
            pdfBuffer,
            workerName: 'Roof Revive - Gobo Clean',
            address: mission.client_address,
          });
          bonSentAt = new Date().toISOString();
        }
      }
    }

    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('missions')
      .update({ payment, bon_sent_at: bonSentAt })
      .eq('id', missionId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to record payment: ${error.message}`);
    }

    this.logger.log(
      `💰 Payment recorded for mission ${missionId} (${dto.method}${dto.amount ? `, ${dto.amount} €` : ''})` +
        (bonSentAt ? ` — bon sent to ${mission.client_email}` : ` — ${bonWarning}`),
    );

    return { mission: data, bon_sent: !!bonSentAt, warning: bonWarning };
  }

  // ---------------------------------------------------------------------------
  // RESCHEDULE (admin) — FIX 7: Block rescheduling active missions
  // ---------------------------------------------------------------------------
  async rescheduleMission(missionId: string, dto: RescheduleMissionDto) {
    const mission = await this.getMissionRaw(missionId);

    if (
      mission.status === 'completed' ||
      mission.status === 'cancelled' ||
      mission.status === 'in_progress' ||
      mission.status === 'waiting_completion'
    ) {
      throw new BadRequestException(`Cannot reschedule a ${mission.status} mission`);
    }

    await this.assertNoEquipmentConflict(dto.appointment_time, mission.equipment, missionId);

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

  /**
   * Clôture bloquante (lot 2 — Ali) : valide checklist + photos + essence.
   * Retourne les objets parsés à stocker sur la mission.
   */
  private validateClosure(
    mission: any,
    closure?: {
      materialPhotos: Express.Multer.File[];
      fuelPhoto?: Express.Multer.File;
      closureChecklistRaw?: string;
      fuelStateRaw?: string;
    },
  ): { checklist: Record<string, boolean> | null; fuelState: FuelState | null } {
    // Transition : tant que la nouvelle PWA (étape Clôture) n'est pas déployée,
    // CLOSURE_ENFORCEMENT=off laisse passer les anciennes tablettes qui
    // n'envoient aucun champ de clôture. À retirer une fois Vercel réparé.
    if (
      process.env.CLOSURE_ENFORCEMENT === 'off' &&
      !closure?.closureChecklistRaw &&
      !closure?.materialPhotos?.length &&
      !closure?.fuelPhoto
    ) {
      this.logger.warn('CLOSURE_ENFORCEMENT=off — completion accepted without closure (legacy PWA)');
      return { checklist: null, fuelState: null };
    }

    // Checklist — tous les points doivent être cochés
    let checklist: Record<string, boolean>;
    try {
      checklist = JSON.parse(closure?.closureChecklistRaw || '{}');
    } catch {
      throw new BadRequestException('closure_checklist must be valid JSON');
    }
    const missing = CLOSURE_CHECKLIST_IDS.filter((id) => checklist[id] !== true);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Closure checklist incomplete — missing: ${missing.join(', ')}. All items must be checked before closing.`,
      );
    }

    // Photos du matériel nettoyé — au moins une
    if (!closure?.materialPhotos?.length) {
      throw new BadRequestException(
        'At least one photo of the cleaned material (camionnette/machine) is required to close the mission.',
      );
    }

    // État essence + kilométrage + photo
    if (!closure.fuelPhoto) {
      throw new BadRequestException('A photo of the fuel gauge / odometer is required to close the mission.');
    }
    let fuelState: FuelState;
    try {
      fuelState = JSON.parse(closure.fuelStateRaw || '{}');
    } catch {
      throw new BadRequestException('fuel_state must be valid JSON');
    }
    if (typeof fuelState.mileage_km !== 'number' || fuelState.mileage_km < 0) {
      throw new BadRequestException('fuel_state.mileage_km (kilométrage camionnette) is required.');
    }
    fuelState.levels = fuelState.levels || {};
    for (const [eq, level] of Object.entries(fuelState.levels)) {
      if (!FUEL_LEVELS.includes(level as any)) {
        throw new BadRequestException(`Invalid fuel level "${level}" for ${eq} (expected: ${FUEL_LEVELS.join('/')})`);
      }
    }
    // Chaque machine à réservoir de la mission doit avoir son niveau
    const requiredFuel = (mission.equipment ?? []).filter((e: string) => FUEL_EQUIPMENT.includes(e));
    const missingFuel = requiredFuel.filter((e: string) => !fuelState.levels[e]);
    if (missingFuel.length > 0) {
      throw new BadRequestException(
        `Fuel level missing for: ${missingFuel.join(', ')} (plein/moitie/vide required for each machine used).`,
      );
    }

    return { checklist, fuelState };
  }

  /**
   * Règle d'Ali : jamais deux équipes sur la même machine le même jour
   * (capacités dans EQUIPMENT_CATALOG ; machine_peinture ×2, camionnette non
   * limitée). Le "jour" est le jour calendaire en Europe/Brussels.
   */
  private async assertNoEquipmentConflict(
    appointmentTime: string,
    equipment: string[] | undefined,
    excludeMissionId?: string,
  ) {
    const limited = (equipment ?? []).filter((e) => EQUIPMENT_CATALOG[e]?.capacity != null);
    if (!limited.length) return;

    const brusselsDay = (iso: string) =>
      new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' });
    const day = brusselsDay(appointmentTime);

    // Fenêtre large ±1 jour UTC, puis filtre exact sur le jour Brussels en JS
    const target = new Date(appointmentTime);
    const from = new Date(target.getTime() - 36 * 3600_000).toISOString();
    const to = new Date(target.getTime() + 36 * 3600_000).toISOString();

    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('missions')
      .select('id, equipment, appointment_time, client_first_name, client_last_name')
      .not('status', 'eq', 'cancelled')
      .gte('appointment_time', from)
      .lte('appointment_time', to);
    if (excludeMissionId) {
      query = query.neq('id', excludeMissionId);
    }
    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to check equipment availability: ${error.message}`);
    }

    const sameDay = (data ?? []).filter((m) => brusselsDay(m.appointment_time) === day);
    for (const eq of limited) {
      const capacity = EQUIPMENT_CATALOG[eq].capacity as number;
      const holders = sameDay.filter((m) => (m.equipment ?? []).includes(eq));
      if (holders.length >= capacity) {
        const who = holders
          .map((m) => `${m.client_first_name} ${m.client_last_name}`)
          .join(', ');
        throw new BadRequestException(
          `Equipment conflict: "${EQUIPMENT_CATALOG[eq].label}" is already booked on ${day} (mission: ${who}). ` +
            `Capacity: ${capacity} per day.`,
        );
      }
    }
  }

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
  // EMAIL HELPER — resolve worker emails from UUIDs
  // ---------------------------------------------------------------------------
  private async resolveWorkerEmails(workerIds: string[]): Promise<string[]> {
    if (!workerIds || workerIds.length === 0) return [];

    const supabase = this.supabaseService.getClient();
    const { data: workers } = await supabase
      .from('users')
      .select('email')
      .in('id', workerIds);

    return (workers || []).map((w) => w.email).filter(Boolean);
  }

  private async getAdminEmails(): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin');

    return (admins || []).map((a) => a.email).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION HELPERS
  // ---------------------------------------------------------------------------

  private async notifyAdminsMissionStarted(mission: any, workerId: string) {
    const supabase = this.supabaseService.getClient();

    // Resolve worker name
    const { data: worker } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', workerId)
      .single();

    const workerName = worker
      ? `${worker.first_name} ${worker.last_name}`
      : 'A worker';

    // Notify all admins
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        await this.notificationsService.createAndSendNotification(
          admin.id,
          'Mission In Progress',
          `${workerName} has started the mission at ${mission.client_address}.`,
          'mission_started',
          mission.id,
        );
      }
    }
  }

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

    // FIX 2: Send assignment email to actual worker emails
    const workerEmails = await this.resolveWorkerEmails(mission.assigned_workers);
    await this.emailService.sendMissionAssignedEmail(mission, workerEmails);
  }

  private async notifyAdminsReportSubmitted(mission: any) {
    const supabase = this.supabaseService.getClient();

    // Find all admins
    const { data: admins } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        await this.notificationsService.createAndSendNotification(
          admin.id,
          'Report Submitted',
          `Before-pictures submitted for mission at ${mission.client_address}. Completion timer started.`,
          'report_submitted',
          mission.id,
        );
      }
    }

    // Send report email to actual admin emails
    const adminEmails = (admins || []).map((a) => a.email).filter(Boolean);
    await this.emailService.sendPreReportEmail(mission, adminEmails);
  }

  private async notifyMissionCompleted(mission: any, pdfBuffer?: Buffer) {
    const supabase = this.supabaseService.getClient();

    // Notify admins
    const { data: admins } = await supabase
      .from('users')
      .select('id, email')
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

    // Lot 3 (Ali) : le CLIENT ne reçoit plus rien à la complétion — le bon
    // d'exécution part à l'enregistrement du paiement (recordPayment).
    // Ici : admins + ouvriers uniquement.
    const adminEmails = (admins || []).map((a) => a.email).filter(Boolean);
    const workerEmails = await this.resolveWorkerEmails(mission.assigned_workers || []);
    const recipientEmails = [...new Set([...adminEmails, ...workerEmails])];
    await this.emailService.sendMissionCompletedEmail(mission, recipientEmails, pdfBuffer);
  }
}
