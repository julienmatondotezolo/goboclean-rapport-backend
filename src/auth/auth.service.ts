import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signup(signupData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: 'worker' | 'admin';
  }) {
    const supabase = this.supabaseService.getClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          first_name: signupData.first_name,
          last_name: signupData.last_name,
          phone: signupData.phone,
          role: signupData.role || 'worker',
        },
      },
    });

    if (authError) {
      throw new UnauthorizedException(authError.message);
    }

    return {
      user: authData.user,
      session: authData.session,
    };
  }

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

  async refreshToken(refreshToken: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    };
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
}
