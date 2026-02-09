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
    aud: string;
    exp: number;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private supabase;
  private supabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration for AuthGuard');
    }

    // Service role client for database queries (bypasses RLS)
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Client for JWT verification (uses anon key)
    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // Use Supabase's built-in JWT verification
      const { data: { user }, error } = await this.supabaseClient.auth.getUser(token);

      if (error) {
        console.error('❌ AuthGuard: Token verification failed:', error.message);
        throw new UnauthorizedException(`Invalid authentication token: ${error.message}`);
      }

      if (!user) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Get user profile from database for role info
      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('id, email, role, first_name, last_name, is_active')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ AuthGuard: Profile fetch failed:', profileError.message);
        throw new UnauthorizedException('User profile not found');
      }

      if (!profile) {
        throw new UnauthorizedException('User profile not found');
      }

      if (!profile.is_active) {
        throw new UnauthorizedException('User account is disabled');
      }

      // Attach user info to request
      request.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        aud: user.aud || 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600, // Add 1 hour as fallback
      };

      console.log('✅ AuthGuard: User authenticated:', profile.email);
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
