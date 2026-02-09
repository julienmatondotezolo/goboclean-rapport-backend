import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException,
  Put 
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

  @Post('signup')
  @ApiOperation({ summary: 'Create a new user account' })
  async signup(
    @Body()
    signupDto: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
      role?: 'worker' | 'admin';
    },
  ) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login to user account' })
  async login(
    @Body()
    loginDto: {
      email: string;
      password: string;
    },
  ) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.id);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
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

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile with profile picture' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.id);
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
}
