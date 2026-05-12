import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register new user with email and password' })
  async signup(@Body() body: { email: string; password: string; name?: string }) {
    return this.authService.signUp(body.email, body.password, body.name);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.signIn(body.email, body.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset email' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a token from the reset email' })
  async resetPassword(@Body() body: { token: string; new_password: string }) {
    return this.authService.resetPassword(body.token, body.new_password);
  }

  @ApiBearerAuth('access-token')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the current user' })
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { current_password: string; new_password: string },
  ) {
    return this.authService.changePassword(
      user.sub,
      body.current_password,
      body.new_password,
    );
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.sub);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out current session' })
  async logout(@Body() body: { refresh_token?: string }) {
    return this.authService.signOut(body?.refresh_token);
  }
}
