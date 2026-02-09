import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify, createRemoteJWKSet } from 'jose';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    aud: string;
    exp: number;
  };
}

interface SupabaseJWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email: string;
  phone?: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: any;
  role: string;
  aal: string;
  amr: Array<{ method: string; timestamp: number }>;
  session_id: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private supabase;
  private supabaseUrl: string;
  private jwks;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!this.supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for AuthGuard');
    }

    // Only need service role client for user queries (not auth)
    this.supabase = createClient(this.supabaseUrl, supabaseServiceKey);
    
    // Set up JWKS for JWT verification
    this.jwks = createRemoteJWKSet(
      new URL(`${this.supabaseUrl}/rest/v1/jwks`)
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // Verify JWT signature and decode payload
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${this.supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      const user = payload as unknown as SupabaseJWTPayload;

      // Check token expiry
      const now = Math.floor(Date.now() / 1000);
      if (user.exp <= now) {
        throw new UnauthorizedException('Token has expired');
      }

      // Check audience
      if (user.aud !== 'authenticated') {
        throw new UnauthorizedException('Invalid token audience');
      }

      // Get user profile from database for role info
      const { data: profile, error: profileError } = await this.supabase
        .from('users')
        .select('id, email, role, first_name, last_name, is_active')
        .eq('id', user.sub)
        .single();

      if (profileError || !profile) {
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
        aud: user.aud,
        exp: user.exp,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Handle JWT verification errors
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException('Token has expired');
      }
      
      if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        throw new UnauthorizedException('Invalid token signature');
      }
      
      console.error('❌ AuthGuard: JWT verification failed:', error.message);
      throw new UnauthorizedException('Invalid authentication token');
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
