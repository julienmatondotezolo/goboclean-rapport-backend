import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BackendAuthGuard} from '../auth/backend-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MissionsService } from './missions.service';
import {
  CreateMissionDto,
  UpdateMissionDto,
  AssignWorkersDto,
  RescheduleMissionDto,
  CalendarQueryDto,
  RecordPaymentDto,
} from './dto';

@ApiTags('missions')
@Controller('missions')
@UseGuards(BackendAuthGuard)
@ApiBearerAuth()
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // -------------------------------------------------------------------------
  // POST /missions — Create mission (admin only)
  // -------------------------------------------------------------------------
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new mission (admin only)' })
  @ApiResponse({ status: 201, description: 'Mission created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createMission(
    @Body() dto: CreateMissionDto,
    @CurrentUser() user: any,
  ) {
    return this.missionsService.createMission(dto, user.id);
  }

  // -------------------------------------------------------------------------
  // GET /missions — List missions (admin=all, worker=own)
  // -------------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'List missions (admin=all, worker=own assigned)' })
  @ApiQuery({ name: 'status', required: false, description: 'Comma-separated status filter (e.g. assigned,in_progress)' })
  @ApiResponse({ status: 200, description: 'Missions retrieved successfully' })
  async getMissions(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.missionsService.getMissions(user, status);
  }

  // -------------------------------------------------------------------------
  // GET /missions/calendar — Calendar date range query
  // -------------------------------------------------------------------------
  @Get('calendar')
  @ApiOperation({ summary: 'Get missions by date range for calendar view' })
  @ApiQuery({ name: 'start', required: true, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'end', required: true, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Calendar missions retrieved' })
  async getCalendarMissions(
    @CurrentUser() user: any,
    @Query() query: CalendarQueryDto,
  ) {
    return this.missionsService.getMissionsByDateRange(user, query.start, query.end);
  }

  // -------------------------------------------------------------------------
  // GET /missions/:id — Get mission detail
  // -------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Get mission by ID' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission found' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async getMission(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.missionsService.getMission(id, user);
  }

  // -------------------------------------------------------------------------
  // PATCH /missions/:id — Update mission (admin)
  // -------------------------------------------------------------------------
  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update mission details (admin only)' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission updated' })
  async updateMission(
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missionsService.updateMission(id, dto);
  }

  // -------------------------------------------------------------------------
  // DELETE /missions/:id — Cancel mission (admin only)
  // -------------------------------------------------------------------------
  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cancel/delete a mission (admin only)' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission cancelled' })
  async cancelMission(@Param('id') id: string) {
    return this.missionsService.cancelMission(id);
  }

  // -------------------------------------------------------------------------
  // POST /missions/:id/assign — Assign workers (admin only)
  // -------------------------------------------------------------------------
  @Post(':id/assign')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Assign workers to a mission (admin only)' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Workers assigned' })
  async assignWorkers(
    @Param('id') id: string,
    @Body() dto: AssignWorkersDto,
  ) {
    return this.missionsService.assignWorkers(id, dto);
  }

  // -------------------------------------------------------------------------
  // POST /missions/:id/start — Worker starts mission
  // -------------------------------------------------------------------------
  @Post(':id/start')
  @ApiOperation({ summary: 'Worker starts a mission (status → in_progress)' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission started' })
  async startMission(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.missionsService.startMission(id, user.id);
  }

  // -------------------------------------------------------------------------
  // POST /missions/:id/before-pictures — Upload before-pictures
  // -------------------------------------------------------------------------
  @Post(':id/before-pictures')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload before-pictures, create pre-report, start completion timer' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Before-pictures uploaded, timer started' })
  async submitBeforePictures(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.missionsService.submitBeforePictures(id, user.id, files);
  }

  // -------------------------------------------------------------------------
  // POST /missions/:id/complete — Complete mission with after-pictures + signatures
  // -------------------------------------------------------------------------
  @Post(':id/complete')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photos', maxCount: 10 },
      { name: 'worker_signature', maxCount: 1 },
      { name: 'client_signature', maxCount: 1 },
      { name: 'material_photos', maxCount: 10 },
      { name: 'fuel_photo', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Complete mission with after-pictures + signatures + blocking closure (checklist, material photos, fuel state)',
  })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        worker_signature: { type: 'string', format: 'binary' },
        client_signature: { type: 'string', format: 'binary' },
        material_photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Photos of cleaned material (camionnette, machine) — at least one required',
        },
        fuel_photo: { type: 'string', format: 'binary', description: 'Photo of the fuel gauge / odometer' },
        closure_checklist: {
          type: 'string',
          description:
            'JSON {nettoyage_client, toit_rince, panneaux_nettoyes, hydrofuge_applique, dibo_rince, camionnette_nettoyee} — all must be true',
        },
        fuel_state: {
          type: 'string',
          description: 'JSON { levels: {<equipment_id>: plein|moitie|vide}, mileage_km: number }',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mission completed, final report created' })
  async completeMission(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('closure_checklist') closureChecklistRaw: string,
    @Body('fuel_state') fuelStateRaw: string,
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
      worker_signature?: Express.Multer.File[];
      client_signature?: Express.Multer.File[];
      material_photos?: Express.Multer.File[];
      fuel_photo?: Express.Multer.File[];
    },
  ) {
    return this.missionsService.completeMission(
      id,
      user.id,
      files.photos || [],
      files.worker_signature?.[0],
      files.client_signature?.[0],
      {
        materialPhotos: files.material_photos || [],
        fuelPhoto: files.fuel_photo?.[0],
        closureChecklistRaw,
        fuelStateRaw,
      },
    );
  }

  // -------------------------------------------------------------------------
  // POST /missions/:id/payment — Record payment + send bon d'exécution (admin)
  // -------------------------------------------------------------------------
  @Post(':id/payment')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: "Record client payment and send the bon d'exécution (report PDF) to the client (admin only)",
  })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: "Payment recorded, bon d'exécution sent" })
  @ApiResponse({ status: 400, description: 'Mission not completed or payment already recorded' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.missionsService.recordPayment(id, dto, user.id);
  }

  // -------------------------------------------------------------------------
  // PATCH /missions/:id/reschedule — Reschedule mission (admin only)
  // -------------------------------------------------------------------------
  @Patch(':id/reschedule')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Reschedule a mission (admin only, drag-to-reschedule)' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission rescheduled' })
  async rescheduleMission(
    @Param('id') id: string,
    @Body() dto: RescheduleMissionDto,
  ) {
    return this.missionsService.rescheduleMission(id, dto);
  }
}
