import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BackendAuthGuard } from './backend-auth.guard';
import { AdminGuard } from './admin.guard';
import { CustomJwtService } from './custom-jwt.service';
import { CustomJwtGuard } from './custom-jwt.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Global()
@Module({
  imports: [
    SupabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'goboclean-jwt-secret',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, BackendAuthGuard, AdminGuard, CustomJwtService, CustomJwtGuard],
  exports: [AuthService, BackendAuthGuard, AdminGuard, CustomJwtService, CustomJwtGuard],
})
export class AuthModule {}
