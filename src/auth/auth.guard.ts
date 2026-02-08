import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private supabase;
  private supabaseAuth;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for AuthGuard');
    }

    // Use anon key for auth verification (validates JWT)
    this.supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    
    // Use service role key for database queries (bypasses RLS)
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      console.error('❌ AuthGuard: No token provided');
      throw new UnauthorizedException('No authentication token provided');
    }

    console.log('🔑 AuthGuard: Token received, verifying...');

    try {
      // Verify JWT token using anon key
      const {
        data: { user },
        error,
      } = await this.supabaseAuth.auth.getUser(token);

      if (error) {
        console.error('❌ AuthGuard: Token verification failed:', error.message);
        throw new UnauthorizedException(`Invalid authentication token: ${error.message}`);
      }

      if (!user) {
        console.error('❌ AuthGuard: No user found in token');
        throw new UnauthorizedException('Invalid authentication token');
      }

      console.log('✅ AuthGuard: Token valid for user:', user.id);

      // Get user profile from database using service role (bypasses RLS)
      console.log('🔍 AuthGuard: Fetching profile from database...');
      const { data: profiles, error: profileError } = await this.supabase
        .from('users')
        .select('id, email, role, first_name, last_name')
        .eq('id', user.id);

      console.log('📊 AuthGuard: Query result:', { 
        profileCount: profiles?.length || 0, 
        hasError: !!profileError 
      });

      if (profileError) {
        console.error('❌ AuthGuard: Profile fetch failed:', profileError.message);
        throw new UnauthorizedException('User profile not found');
      }

      if (!profiles || profiles.length === 0) {
        console.error('❌ AuthGuard: No profile found for user:', user.id);
        throw new UnauthorizedException('User profile not found');
      }

      const profile = profiles[0];
      console.log('✅ AuthGuard: User authenticated:', profile.email);

      // Attach user info to request
      request.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('❌ AuthGuard: Unexpected error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
