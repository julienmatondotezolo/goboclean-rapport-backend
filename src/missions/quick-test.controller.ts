import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('Email')
@Controller('quick-test')
export class QuickTestController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get('create-simple-photo-test')
  @ApiOperation({ summary: 'Create simple photo test data' })
  async createSimplePhotoTest() {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get existing mission ID
      console.log('🔍 Finding existing mission...');
      const { data: missions } = await supabase
        .from('missions')
        .select('id, client_first_name, client_last_name, client_address, client_phone')
        .limit(1);
      
      if (!missions || missions.length === 0) {
        return { success: false, error: 'No missions found' };
      }
      
      const mission = missions[0];
      console.log('✅ Found mission:', mission.id);
      
      // Get a worker
      const { data: workers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'worker')
        .limit(1);
      
      if (!workers || workers.length === 0) {
        return { success: false, error: 'No workers found' };
      }
      
      const workerId = workers[0].id;
      console.log('👷 Using worker:', workerId);
      
      // Create a minimal report without optional fields
      console.log('📋 Creating minimal report...');
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          worker_id: workerId,
          client_first_name: mission.client_first_name,
          client_last_name: mission.client_last_name,
          client_address: mission.client_address,
          client_phone: mission.client_phone,
          status: 'draft'
        })
        .select()
        .single();
      
      if (reportError) {
        console.error('❌ Report creation failed:', reportError);
        return { success: false, error: `Report creation failed: ${reportError.message}` };
      }
      
      console.log('✅ Report created:', report.id);
      
      // Create photo record
      console.log('📸 Creating photo record...');
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .insert({
          report_id: report.id,
          type: 'before',
          storage_path: 'test/photos/before-test-1.jpg',
          order: 1
        })
        .select()
        .single();
      
      if (photoError) {
        console.error('❌ Photo creation failed:', photoError);
        return { success: false, error: `Photo creation failed: ${photoError.message}` };
      }
      
      console.log('✅ Photo record created:', photo.id);
      
      // Link report to mission as pre_report_id
      console.log('🔗 Linking report to mission...');
      const { data: updatedMission, error: updateError } = await supabase
        .from('missions')
        .update({ pre_report_id: report.id })
        .eq('id', mission.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Mission update failed:', updateError);
        return { success: false, error: `Mission update failed: ${updateError.message}` };
      }
      
      console.log('✅ Mission linked to report');
      
      return {
        success: true,
        message: 'Simple photo test data created successfully',
        data: {
          mission_id: mission.id,
          report_id: report.id,
          photo_id: photo.id,
          pre_report_id: updatedMission.pre_report_id
        }
      };
      
    } catch (error: any) {
      console.error('❌ Test creation failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  @Get('test-mission-photos')
  @ApiOperation({ summary: 'Test if mission returns photos via service' })
  async testMissionPhotos() {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Find a mission with pre_report_id
      console.log('🔍 Finding mission with pre_report_id...');
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .not('pre_report_id', 'is', null)
        .limit(1);
      
      if (!missions || missions.length === 0) {
        return { success: false, error: 'No missions with pre_report_id found' };
      }
      
      const mission = missions[0];
      console.log('✅ Found mission with pre_report_id:', mission.id);
      
      // Try to get photos via the same method as MissionsService
      const reportIds = [mission.pre_report_id, mission.final_report_id].filter(Boolean);
      
      console.log('📋 Looking for reports:', reportIds);
      
      // Get reports with photos
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          status,
          photos!inner(storage_path, type, order)
        `)
        .in('id', reportIds);
      
      if (reportsError) {
        console.error('❌ Reports query failed:', reportsError);
        return { success: false, error: `Reports query failed: ${reportsError.message}` };
      }
      
      console.log('📊 Found reports:', reports?.length || 0);
      
      // Process photos
      let beforePhotos: string[] = [];
      let afterPhotos: string[] = [];
      
      if (reports) {
        for (const report of reports) {
          if (report.photos) {
            for (const photo of report.photos) {
              const publicUrl = supabase.storage.from('roof-photos').getPublicUrl(photo.storage_path).data.publicUrl;
              
              if (photo.type === 'before') {
                beforePhotos.push(publicUrl);
              } else if (photo.type === 'after') {
                afterPhotos.push(publicUrl);
              }
            }
          }
        }
      }
      
      console.log('📸 Photos found:', { before: beforePhotos.length, after: afterPhotos.length });
      
      return {
        success: true,
        message: 'Mission photo test completed',
        mission: {
          id: mission.id,
          status: mission.status,
          pre_report_id: mission.pre_report_id,
          final_report_id: mission.final_report_id
        },
        photos: {
          before_pictures_count: beforePhotos.length,
          after_pictures_count: afterPhotos.length,
          before_pictures: beforePhotos,
          after_pictures: afterPhotos
        },
        raw_data: {
          reports: reports,
          report_ids: reportIds
        }
      };
      
    } catch (error: any) {
      console.error('❌ Mission photo test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}