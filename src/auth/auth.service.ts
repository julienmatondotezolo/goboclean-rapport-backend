import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // ❌ REMOVED: signup, login, refreshToken methods
  // ✅ These are handled directly by Supabase on frontend

  async getUserProfile(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new UnauthorizedException('User not found');
    }

    return data;
  }

  async completeOnboarding(
    userId: string,
    firstName: string,
    lastName: string,
    profilePicture: Express.Multer.File,
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      // Validate image file
      if (!profilePicture.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }

      // Validate file size (max 5MB)
      if (profilePicture.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Image size must be less than 5MB');
      }

      // Get file extension
      const fileExt = profilePicture.originalname.split('.').pop() || 'jpg';
      const fileName = `${userId}/profile.${fileExt}`;

      // Upload to Supabase Storage
      const uploadResult = await this.supabaseService.uploadFile(
        'profile-pictures',
        fileName,
        profilePicture.buffer,
        profilePicture.mimetype,
      );

      // Get public URL
      const publicUrl = await this.supabaseService.getPublicUrl(
        'profile-pictures',
        fileName,
      );

      // Update user profile with all data
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          profile_picture_url: publicUrl,
          is_onboarded: true,
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(`Failed to update user profile: ${updateError.message}`);
      }

      // Log user activity (onboarding completed)
      await supabase.from('user_activity').insert({
        user_id: userId,
        activity_type: 'login',
        user_agent: 'onboarding-complete',
        device_info: { onboarding: true },
      });

      return {
        success: true,
        message: 'Onboarding completed successfully',
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to complete onboarding: ${error.message}`);
    }
  }

  async updateProfilePicture(
    userId: string,
    profilePicture: Express.Multer.File,
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      // Validate image file
      if (!profilePicture.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }

      // Validate file size (max 5MB)
      if (profilePicture.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Image size must be less than 5MB');
      }

      // Get file extension
      const fileExt = profilePicture.originalname.split('.').pop() || 'jpg';
      const fileName = `${userId}/profile.${fileExt}`;

      // Upload to Supabase Storage (upsert will replace existing file)
      await this.supabaseService.uploadFile(
        'profile-pictures',
        fileName,
        profilePicture.buffer,
        profilePicture.mimetype,
      );

      // Get public URL
      const publicUrl = await this.supabaseService.getPublicUrl(
        'profile-pictures',
        fileName,
      );

      // Update user profile with new picture URL
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          profile_picture_url: publicUrl,
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(`Failed to update profile picture: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Profile picture updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update profile picture: ${error.message}`);
    }
  }

  async updatePreferences(
    userId: string,
    preferences: {
      language?: 'en' | 'fr' | 'nl';
      push_notifications_enabled?: boolean;
      stay_connected?: boolean;
    },
  ) {
    const supabase = this.supabaseService.getClient();

    try {
      // Build update object with only provided fields
      const updateData: any = {};
      
      if (preferences.language !== undefined) {
        if (!['en', 'fr', 'nl'].includes(preferences.language)) {
          throw new BadRequestException('Invalid language. Must be en, fr, or nl');
        }
        updateData.language = preferences.language;
      }
      
      if (preferences.push_notifications_enabled !== undefined) {
        updateData.push_notifications_enabled = preferences.push_notifications_enabled;
      }
      
      if (preferences.stay_connected !== undefined) {
        updateData.stay_connected = preferences.stay_connected;
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No preferences provided to update');
      }

      // Update user preferences
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(`Failed to update preferences: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Preferences updated successfully',
        preferences: {
          language: updatedUser.language,
          push_notifications_enabled: updatedUser.push_notifications_enabled,
          stay_connected: updatedUser.stay_connected,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update preferences: ${error.message}`);
    }
  }

  async setPassword(userId: string, password: string) {
    try {
      // Password validation
      if (password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }

      if (!/[A-Z]/.test(password)) {
        throw new BadRequestException('Password must contain at least one uppercase letter');
      }

      if (!/[a-z]/.test(password)) {
        throw new BadRequestException('Password must contain at least one lowercase letter');
      }

      if (!/[0-9]/.test(password)) {
        throw new BadRequestException('Password must contain at least one number');
      }

      // Use Supabase Admin API to update user password
      const adminClient = this.supabaseService.getAdminClient();
      
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: password,
      });

      if (updateError) {
        throw new BadRequestException(`Failed to set password: ${updateError.message}`);
      }

      // Log user activity
      const supabase = this.supabaseService.getClient();
      await supabase.from('user_activity').insert({
        user_id: userId,
        activity_type: 'password_set',
        user_agent: 'password-setup',
        device_info: { action: 'set_password' },
      });

      return {
        success: true,
        message: 'Password set successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to set password: ${error.message}`);
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      // New password validation
      if (newPassword.length < 8) {
        throw new BadRequestException('New password must be at least 8 characters long');
      }

      if (!/[A-Z]/.test(newPassword)) {
        throw new BadRequestException('New password must contain at least one uppercase letter');
      }

      if (!/[a-z]/.test(newPassword)) {
        throw new BadRequestException('New password must contain at least one lowercase letter');
      }

      if (!/[0-9]/.test(newPassword)) {
        throw new BadRequestException('New password must contain at least one number');
      }

      // First, verify current password by getting user email and trying to sign in
      const supabase = this.supabaseService.getClient();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new BadRequestException('User not found');
      }

      // Verify current password
      const clientSupabase = this.supabaseService.getClientSupabase();
      const { error: signInError } = await clientSupabase.auth.signInWithPassword({
        email: userData.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Use Supabase Admin API to update user password
      const adminClient = this.supabaseService.getAdminClient();
      
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) {
        throw new BadRequestException(`Failed to change password: ${updateError.message}`);
      }

      // Log user activity
      await supabase.from('user_activity').insert({
        user_id: userId,
        activity_type: 'password_changed',
        user_agent: 'password-change',
        device_info: { action: 'change_password' },
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to change password: ${error.message}`);
    }
  }
}
