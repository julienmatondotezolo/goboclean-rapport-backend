import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CustomJwtService, JwtPayload } from './custom-jwt.service';

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
export class BackendAuthGuard implements CanActivate {
  constructor(private customJwtService: CustomJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      console.log('❌ BackendAuthGuard: No token provided');
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      console.log('🔐 BackendAuthGuard: Validating token...');
      
      // Use our custom JWT service to validate the token
      const payload: JwtPayload = await this.customJwtService.validateToken(token);
      
      console.log('✅ BackendAuthGuard: Token valid for user:', payload.email);

      // Attach user info to request
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        aud: 'authenticated',
        exp: payload.exp,
      };

      return true;
    } catch (error) {
      console.error('❌ BackendAuthGuard: Token validation failed:', error.message);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
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