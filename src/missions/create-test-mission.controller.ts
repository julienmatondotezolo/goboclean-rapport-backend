import { Controller, Post, Body, UseInterceptors, UploadedFiles, Param } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MissionType, MissionSubtype } from './dto/create-mission.dto';

@ApiTags('Email')
@Controller('test-missions')
export class CreateTestMissionController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create test mission (no auth required)' })
  async createTestMission(@Body() body: { clientName?: string }) {
    try {
      // Mock admin user
      const adminUserId = '550e8400-e29b-41d4-a716-446655440002';
      
      // Create test mission data
      const missionData = {
        client_first_name: body.clientName?.split(' ')[0] || 'Test',
        client_last_name: body.clientName?.split(' ')[1] || 'Client', 
        client_phone: '+32 471 XX XX XX',
        client_email: 'test@example.com',
        client_address: 'Test Address 123, Brussels',
        client_latitude: 50.8503,
        client_longitude: 4.3517,
        appointment_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
        mission_type: MissionType.ROOF,
        mission_subtypes: [MissionSubtype.CLEANING],
        surface_area: 100,
        facade_count: 1,
        additional_info: 'Test mission created for photo upload testing',
        assigned_workers: ['550e8400-e29b-41d4-a716-446655440001']
      };

      console.log('📋 Creating test mission with data:', missionData);
      
      const mission = await this.missionsService.createMission(missionData, adminUserId);
      
      console.log('✅ Test mission created:', mission.id);
      
      return {
        success: true,
        message: 'Test mission created successfully',
        mission: {
          id: mission.id,
          status: mission.status,
          client_address: mission.client_address,
          appointment_time: mission.appointment_time,
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to create test mission:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create test mission'
      };
    }
  }

  @Post(':id/test-before-pictures')
  @UseInterceptors(FilesInterceptor('photos', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload test before-pictures (no auth required)' })
  async uploadTestBeforePictures(
    @Param('id') missionId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const workerId = '550e8400-e29b-41d4-a716-446655440001';
      
      console.log(`📸 Starting before-pictures upload for mission ${missionId}`);
      console.log(`📁 Received ${files?.length || 0} files`);
      
      if (!files || files.length === 0) {
        // Create dummy image data for testing
        const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        files = [
          {
            originalname: 'test-before-1.png',
            mimetype: 'image/png',
            size: dummyImageBuffer.length,
            buffer: dummyImageBuffer,
          } as Express.Multer.File,
          {
            originalname: 'test-before-2.png', 
            mimetype: 'image/png',
            size: dummyImageBuffer.length,
            buffer: dummyImageBuffer,
          } as Express.Multer.File,
        ];
        console.log('📸 Created 2 dummy test images');
      }
      
      console.log('📤 Calling submitBeforePictures...');
      const result = await this.missionsService.submitBeforePictures(missionId, workerId, files);
      
      console.log('✅ Before-pictures uploaded successfully');
      
      return {
        success: true,
        message: `Before-pictures uploaded successfully for mission ${missionId}`,
        result: {
          mission_id: result.mission?.id,
          status: result.mission?.status,
          before_pictures_count: result.before_pictures?.length || 0,
          report_id: result.report_id,
          completion_unlocked_at: result.completion_unlocked_at
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to upload before-pictures:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        message: 'Failed to upload before-pictures'
      };
    }
  }

  @Post(':id/start-mission')
  @ApiOperation({ summary: 'Start test mission (no auth required)' })
  async startTestMission(@Param('id') missionId: string) {
    try {
      const workerId = '550e8400-e29b-41d4-a716-446655440001';
      
      console.log(`🚀 Starting mission ${missionId}`);
      const result = await this.missionsService.startMission(missionId, workerId);
      
      console.log('✅ Mission started successfully');
      
      return {
        success: true,
        message: `Mission ${missionId} started successfully`,
        mission: {
          id: result.id,
          status: result.status,
          started_at: result.started_at
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to start mission:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to start mission'
      };
    }
  }

  @Post(':id/check-photos')
  @ApiOperation({ summary: 'Check mission photos (no auth required)' })
  async checkMissionPhotos(@Param('id') missionId: string) {
    try {
      const user = { id: '550e8400-e29b-41d4-a716-446655440002', role: 'admin' };
      
      console.log(`🔍 Checking photos for mission ${missionId}`);
      const mission = await this.missionsService.getMission(missionId, user);
      
      console.log('📊 Mission photo status:', {
        before_count: mission.before_pictures?.length || 0,
        after_count: mission.after_pictures?.length || 0,
        pre_report_id: mission.pre_report_id,
        final_report_id: mission.final_report_id
      });
      
      return {
        success: true,
        message: `Mission ${missionId} photos checked`,
        photos: {
          before_pictures_count: mission.before_pictures?.length || 0,
          after_pictures_count: mission.after_pictures?.length || 0,
          before_pictures: mission.before_pictures || [],
          after_pictures: mission.after_pictures || [],
          pre_report_id: mission.pre_report_id,
          final_report_id: mission.final_report_id,
          status: mission.status
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to check mission photos:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to check mission photos'
      };
    }
  }
}