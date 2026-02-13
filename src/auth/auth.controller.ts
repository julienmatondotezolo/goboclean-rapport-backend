import { 
  Controller, 
  Get, 
  Post, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException,
  Put,
  Body 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ❌ REMOVED: signup, login, refresh endpoints
  // ✅ These are handled directly by Supabase on frontend

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.id);
  }

  @Post('onboarding')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Complete user onboarding with profile picture' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['firstName', 'lastName', 'profilePicture'],
    },
  })
  async completeOnboarding(
    @CurrentUser() user: any,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @UploadedFile() profilePicture: Express.Multer.File,
  ) {
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    if (!profilePicture) {
      throw new BadRequestException('Profile picture is required');
    }

    return this.authService.completeOnboarding(
      user.id,
      firstName.trim(),
      lastName.trim(),
      profilePicture,
    );
  }

  @Put('profile/picture')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user profile picture' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['profilePicture'],
    },
  })
  async updateProfilePicture(
    @CurrentUser() user: any,
    @UploadedFile() profilePicture: Express.Multer.File,
  ) {
    if (!profilePicture) {
      throw new BadRequestException('Profile picture is required');
    }

    return this.authService.updateProfilePicture(user.id, profilePicture);
  }

  @Put('preferences')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body()
    preferences: {
      language?: 'en' | 'fr' | 'nl';
      push_notifications_enabled?: boolean;
      stay_connected?: boolean;
    },
  ) {
    return this.authService.updatePreferences(user.id, preferences);
  }

  @Put('set-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password for new user (first-time setup)' })
  async setPassword(
    @CurrentUser() user: any,
    @Body() body: { password: string },
  ) {
    if (!body.password) {
      throw new BadRequestException('Password is required');
    }

    return this.authService.setPassword(user.id, body.password);
  }

  @Put('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for existing user' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}
