import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: 'worker' | 'admin';
}

@Injectable()
export class CustomJwtService {
  private supabase;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for CustomJwtService');
    }

    // Use service role for admin operations
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Authenticate user with email/password using Supabase Admin API
   */
  async login(credentials: LoginCredentials) {
    const { email, password } = credentials;

    console.log('🔐 CustomJWT: Login attempt for:', email);

    try {
      // First, try to authenticate with Supabase
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('❌ CustomJWT: Supabase auth failed:', authError?.message);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Get user profile from database
      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ CustomJWT: Profile fetch failed:', profileError?.message);
        throw new UnauthorizedException('User profile not found');
      }

      if (!profile.is_active) {
        throw new UnauthorizedException('User account is disabled');
      }

      // Generate custom JWT token (let JWT module handle expiration)
      const payload = {
        sub: profile.id,
        email: profile.email,
        role: profile.role,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      // Log successful login
      await this.supabase.from('user_activity').insert({
        user_id: profile.id,
        activity_type: 'login',
        user_agent: 'backend-jwt',
        device_info: { backend_auth: true },
      });

      console.log('✅ CustomJWT: Login successful for:', email);

      return {
        access_token: accessToken,
        user: {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          profile_picture_url: profile.profile_picture_url,
          is_onboarded: profile.is_onboarded,
          language: profile.language,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('❌ CustomJWT: Login error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Register new user using Supabase Admin API
   */
  async register(userData: RegisterData) {
    const { email, password, first_name, last_name, phone, role = 'worker' } = userData;

    console.log('🔐 CustomJWT: Registration attempt for:', email);

    try {
      // Create user with Supabase Admin API
      const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation for admin creation
        user_metadata: {
          first_name,
          last_name,
          phone,
          role,
        },
      });

      if (authError || !authData.user) {
        console.error('❌ CustomJWT: Supabase user creation failed:', authError?.message);
        
        if (authError?.message.includes('already registered')) {
          throw new UnauthorizedException('Email already registered');
        }
        
        throw new UnauthorizedException('Registration failed');
      }

      // Create user profile in database
      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          first_name,
          last_name,
          phone,
          role,
          is_active: true,
          is_onboarded: false,
          language: 'fr', // Default language
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ CustomJWT: Profile creation failed:', profileError.message);
        // Clean up the auth user if profile creation fails
        await this.supabase.auth.admin.deleteUser(authData.user.id);
        throw new UnauthorizedException('Registration failed');
      }

      // Generate custom JWT token (let JWT module handle expiration)
      const payload = {
        sub: profile.id,
        email: profile.email,
        role: profile.role,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      // Log registration
      await this.supabase.from('user_activity').insert({
        user_id: profile.id,
        activity_type: 'register',
        user_agent: 'backend-jwt',
        device_info: { backend_auth: true },
      });

      console.log('✅ CustomJWT: Registration successful for:', email);

      return {
        access_token: accessToken,
        user: {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          profile_picture_url: profile.profile_picture_url,
          is_onboarded: profile.is_onboarded,
          language: profile.language,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('❌ CustomJWT: Registration error:', error);
      throw new UnauthorizedException('Registration failed');
    }
  }

  /**
   * Validate JWT token and return user data
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      
      // Additional validation - check if user still exists and is active
      const { data: user, error } = await this.supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', payload.sub)
        .single();

      if (error || !user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return payload;
    } catch (error) {
      console.error('❌ CustomJWT: Token validation failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Generate refresh token (for future implementation)
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };

    return await this.jwtService.signAsync(payload);
  }

  /**
   * Refresh access token using refresh token (for future implementation)
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user data
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single();

      if (error || !user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token (let JWT module handle expiration)
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(newPayload);

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          profile_picture_url: user.profile_picture_url,
          is_onboarded: user.is_onboarded,
          language: user.language,
        },
      };
    } catch (error) {
      console.error('❌ CustomJWT: Refresh token failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}