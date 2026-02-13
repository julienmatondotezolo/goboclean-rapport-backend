import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { BackendAuthGuard} from '../auth/backend-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { MissionsService } from './missions.service';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('Admin')
@Controller('admin/missions-test')
@UseGuards(BackendAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MissionsTestController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('photo-debug/:id')
  @ApiOperation({ 
    summary: 'Debug mission photos (admin only)', 
    description: 'Debug endpoint to check if mission photos are correctly linked and returned'
  })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Photo debug info' })
  async debugMissionPhotos(@Param('id') missionId: string) {
    const supabase = this.supabaseService.getClient();

    // Get mission details
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (missionError || !mission) {
      return { error: 'Mission not found', missionId };
    }

    // Get report photos
    let reportPhotos: any[] = [];
    if (mission.report_id) {
      const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .eq('report_id', mission.report_id)
        .order('order');
      reportPhotos = photos || [];
    }

    // Generate public URLs
    const beforePhotos = await Promise.all(
      reportPhotos
        .filter(p => p.type === 'before')
        .map(async p => ({
          id: p.id,
          storage_path: p.storage_path,
          public_url: await this.supabaseService.getPublicUrl('roof-photos', p.storage_path),
          order: p.order,
        }))
    );

    const afterPhotos = await Promise.all(
      reportPhotos
        .filter(p => p.type === 'after')
        .map(async p => ({
          id: p.id,
          storage_path: p.storage_path,
          public_url: await this.supabaseService.getPublicUrl('roof-photos', p.storage_path),
          order: p.order,
        }))
    );

    return {
      mission: {
        id: mission.id,
        status: mission.status,
        report_id: mission.report_id,
        client_address: mission.client_address,
      },
      photo_debug: {
        before_photos_count: beforePhotos.length,
        after_photos_count: afterPhotos.length,
        before_photos: beforePhotos,
        after_photos: afterPhotos,
      },
      raw_data: {
        report_photos: reportPhotos,
      }
    };
  }

  @Get('photo-test')
  @ApiOperation({ 
    summary: 'Test mission photo arrays (admin only)', 
    description: 'Test endpoint to verify that mission arrays include before_pictures and after_pictures'
  })
  @ApiResponse({ status: 200, description: 'Mission photo test results' })
  async testMissionPhotoArrays() {
    const user = { id: 'admin', role: 'admin' };
    
    // Get missions using the service method
    const missions = await this.missionsService.getMissions(user);
    
    const photoStats = missions.map(mission => ({
      id: mission.id,
      status: mission.status,
      client_address: mission.client_address,
      report_id: mission.report_id,
      before_pictures_count: mission.before_pictures?.length || 0,
      after_pictures_count: mission.after_pictures?.length || 0,
      has_before_pictures: !!mission.before_pictures?.length,
      has_after_pictures: !!mission.after_pictures?.length,
      before_pictures: mission.before_pictures || [],
      after_pictures: mission.after_pictures || [],
    }));

    const totalMissions = missions.length;
    const withBeforePhotos = photoStats.filter(m => m.has_before_pictures).length;
    const withAfterPhotos = photoStats.filter(m => m.has_after_pictures).length;

    return {
      summary: {
        total_missions: totalMissions,
        missions_with_before_photos: withBeforePhotos,
        missions_with_after_photos: withAfterPhotos,
      },
      missions: photoStats,
    };
  }
}