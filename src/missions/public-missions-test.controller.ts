import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('Email')
@Controller('public-missions-test')
export class PublicMissionsTestController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('missions-with-photos')
  @ApiOperation({ summary: 'Test missions with photo arrays (no auth required)' })
  @ApiResponse({ status: 200, description: 'Mission photo test results' })
  async testMissionsWithPhotos() {
    try {
      const user = { id: 'admin', role: 'admin' };
      
      // Get missions using the service method
      const missions = await this.missionsService.getMissions(user);
      
      const photoStats = missions.map(mission => ({
        id: mission.id,
        status: mission.status,
        client_address: mission.client_address,
        pre_report_id: mission.pre_report_id,
        final_report_id: mission.final_report_id,
        before_pictures_count: mission.before_pictures?.length || 0,
        after_pictures_count: mission.after_pictures?.length || 0,
        has_before_pictures: !!mission.before_pictures?.length,
        has_after_pictures: !!mission.after_pictures?.length,
        before_pictures_sample: mission.before_pictures?.slice(0, 2) || [],
        after_pictures_sample: mission.after_pictures?.slice(0, 2) || [],
      }));

      const totalMissions = missions.length;
      const withBeforePhotos = photoStats.filter(m => m.has_before_pictures).length;
      const withAfterPhotos = photoStats.filter(m => m.has_after_pictures).length;

      return {
        success: true,
        summary: {
          total_missions: totalMissions,
          missions_with_before_photos: withBeforePhotos,
          missions_with_after_photos: withAfterPhotos,
        },
        missions: photoStats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to test missions with photos'
      };
    }
  }

  @Get('debug-mission/:id')
  @ApiOperation({ summary: 'Debug specific mission photos (no auth required)' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission debug info' })
  async debugMissionPhotos(@Param('id') missionId: string) {
    try {
      const supabase = this.supabaseService.getClient();

      // Get mission details
      const { data: mission, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (missionError || !mission) {
        return { 
          success: false,
          error: 'Mission not found', 
          missionId 
        };
      }

      // Get reports linked to this mission
      let reports: any[] = [];
      const reportIds = [mission.pre_report_id, mission.final_report_id].filter(Boolean);
      
      if (reportIds.length > 0) {
        const { data: reportsData } = await supabase
          .from('reports')
          .select('*')
          .in('id', reportIds);
        reports = reportsData || [];
      }

      // Get photos for these reports
      let allPhotos: any[] = [];
      if (reportIds.length > 0) {
        const { data: photosData } = await supabase
          .from('photos')
          .select('*')
          .in('report_id', reportIds)
          .order('order');
        allPhotos = photosData || [];
      }

      // Test the mission service enrichment
      const user = { id: 'admin', role: 'admin' };
      const enrichedMission = await this.missionsService.getMission(missionId, user);

      return {
        success: true,
        mission: {
          id: mission.id,
          status: mission.status,
          client_address: mission.client_address,
          pre_report_id: mission.pre_report_id,
          final_report_id: mission.final_report_id,
        },
        raw_data: {
          reports: reports,
          photos: allPhotos,
        },
        enriched_mission: {
          before_pictures: enrichedMission.before_pictures || [],
          after_pictures: enrichedMission.after_pictures || [],
          before_count: enrichedMission.before_pictures?.length || 0,
          after_count: enrichedMission.after_pictures?.length || 0,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to debug mission photos'
      };
    }
  }

  @Get('raw-missions')
  @ApiOperation({ summary: 'Get raw missions from database (no auth required)' })
  @ApiResponse({ status: 200, description: 'Raw missions data' })
  async getRawMissions() {
    try {
      const supabase = this.supabaseService.getClient();

      // Get all missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .limit(5);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        total: missions.length,
        missions: missions.map(m => ({
          id: m.id,
          status: m.status,
          client_address: m.client_address,
          pre_report_id: m.pre_report_id,
          final_report_id: m.final_report_id,
          created_at: m.created_at,
        }))
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get raw missions'
      };
    }
  }
}