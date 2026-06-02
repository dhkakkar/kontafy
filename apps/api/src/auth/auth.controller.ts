import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

// Bodies on these endpoints are inline TS types, which the Swagger
// metadata-reflection plugin can't introspect — without an explicit
// @ApiBody schema, every endpoint renders as "No parameters" in
// Swagger UI. The schemas below describe the same shapes inline so
// the docs site (docs.kontafy.com) gets a usable request form and
// curl snippet for each endpoint without needing class-based DTOs.

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register new user with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'owner@acme.com' },
        password: { type: 'string', minLength: 8, example: 'StrongPass#123' },
        name: { type: 'string', example: 'Rahul Sharma' },
      },
    },
  })
  async signup(@Body() body: { email: string; password: string; name?: string }) {
    return this.authService.signUp(body.email, body.password, body.name);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'owner@acme.com' },
        password: { type: 'string', example: 'StrongPass#123' },
      },
    },
  })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.signIn(body.email, body.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5...' },
      },
    },
  })
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'owner@acme.com' },
      },
    },
  })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a token from the reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'new_password'],
      properties: {
        token: { type: 'string', description: 'Token from the password-reset email link' },
        new_password: { type: 'string', minLength: 8, example: 'NewStrongPass#123' },
      },
    },
  })
  async resetPassword(@Body() body: { token: string; new_password: string }) {
    return this.authService.resetPassword(body.token, body.new_password);
  }

  @ApiBearerAuth('access-token')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the current user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['current_password', 'new_password'],
      properties: {
        current_password: { type: 'string', example: 'OldPass#123' },
        new_password: { type: 'string', minLength: 8, example: 'NewStrongPass#123' },
      },
    },
  })
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          description:
            'Optional. If omitted, only the current access token is revoked; pass it to also invalidate the matching refresh token.',
        },
      },
    },
  })
  async logout(@Body() body: { refresh_token?: string }) {
    return this.authService.signOut(body?.refresh_token);
  }
}
