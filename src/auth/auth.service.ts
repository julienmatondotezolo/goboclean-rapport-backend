import { Injectable, UnauthorizedException } from '@nestjs/common';
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
}
