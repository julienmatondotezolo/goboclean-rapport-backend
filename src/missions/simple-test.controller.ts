import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('Email')
@Controller('simple-test')
export class SimpleTestController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users from database' })
  async listUsers() {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, email')
        .limit(10);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return {
        success: true,
        users: users,
        total: users.length
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('create-mission-direct')
  @ApiOperation({ summary: 'Create mission directly via Supabase' })
  async createMissionDirect(@Body() body: { clientName?: string }) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // First get a real user
      const { data: users } = await supabase
        .from('users')
        .select('id, role')
        .eq('role', 'admin')
        .limit(1);
      
      let adminUserId = users?.[0]?.id;
      if (!adminUserId) {
        // Get any user if no admin exists
        const { data: anyUsers } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        adminUserId = anyUsers?.[0]?.id;
      }
      
      if (!adminUserId) {
        return { success: false, error: 'No users found in database' };
      }
      
      console.log('📋 Using admin user ID:', adminUserId);
      
      // Create mission directly in database
      const { data: mission, error } = await supabase
        .from('missions')
        .insert({
          created_by: adminUserId,
          client_first_name: body.clientName?.split(' ')[0] || 'Test',
          client_last_name: body.clientName?.split(' ')[1] || 'Client',
          client_phone: '+32 471 XX XX XX',
          client_email: 'test@example.com',
          client_address: 'Test Address 123, Brussels',
          appointment_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          mission_type: 'roof',
          mission_subtypes: ['cleaning'],
          surface_area: 100,
          facade_count: 1,
          additional_info: 'Test mission created for photo upload testing',
          status: 'assigned'
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Mission creation error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ Mission created:', mission.id);
      
      return {
        success: true,
        message: 'Mission created directly via Supabase',
        mission: {
          id: mission.id,
          status: mission.status,
          client_address: mission.client_address,
          appointment_time: mission.appointment_time
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to create mission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('test-photo-upload/:id')
  @ApiOperation({ summary: 'Test photo upload workflow' })
  async testPhotoUpload(@Body() body: { missionId: string }) {
    try {
      const supabase = this.supabaseService.getClient();
      
      console.log('🔍 Testing photo upload for mission:', body.missionId);
      
      // First get a real worker
      const { data: workers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'worker')
        .limit(1);
      
      const workerId = workers?.[0]?.id;
      if (!workerId) {
        return { success: false, error: 'No workers found in database' };
      }
      
      console.log('👷 Using worker ID:', workerId);
      
      // Step 1: Create a report
      console.log('📋 Creating test report...');
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          worker_id: workerId,
          client_first_name: 'Test',
          client_last_name: 'Client',
          client_address: 'Test Address',
          client_phone: '+32 471 XX XX XX',
          roof_type: 'flat',
          roof_surface: 100,
          roof_material: 'concrete',
          roof_angle: 5,
          work_summary: 'Test cleaning work',
          status: 'draft'
        })
        .select()
        .single();
      
      if (reportError) {
        console.error('❌ Report creation failed:', reportError);
        return { success: false, error: `Report creation failed: ${reportError.message}` };
      }
      
      console.log('✅ Report created:', report.id);
      
      // Step 2: Create photo records
      console.log('📸 Creating photo records...');
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .insert({
          report_id: report.id,
          type: 'before',
          storage_path: 'test/before/photo1.jpg',
          order: 1
        })
        .select()
        .single();
      
      if (photoError) {
        console.error('❌ Photo creation failed:', photoError);
        return { success: false, error: `Photo creation failed: ${photoError.message}` };
      }
      
      console.log('✅ Photo record created:', photo.id);
      
      // Step 3: Link report to mission
      console.log('🔗 Linking report to mission...');
      const { data: updatedMission, error: missionError } = await supabase
        .from('missions')
        .update({ pre_report_id: report.id })
        .eq('id', body.missionId)
        .select()
        .single();
      
      if (missionError) {
        console.error('❌ Mission update failed:', missionError);
        return { success: false, error: `Mission update failed: ${missionError.message}` };
      }
      
      console.log('✅ Mission updated with report ID');
      
      return {
        success: true,
        message: 'Photo upload workflow test completed',
        data: {
          report_id: report.id,
          photo_id: photo.id,
          mission_id: updatedMission.id,
          pre_report_id: updatedMission.pre_report_id
        }
      };
    } catch (error: any) {
      console.error('❌ Photo upload test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}