import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user\'s profile fields — name, email, phone and avatar URL. This is the user-scoped view; for the post-login bootstrap that also returns org memberships call `GET /auth/me`.',
  })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update name, email, phone, avatar',
    description:
      'Patches mutable fields on the user profile. Email changes are unique-checked across the platform and will 409 if another account already owns the address. To set a new avatar from an image upload, use `POST /profile/avatar` instead.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Rahul Sharma' },
        email: { type: 'string', format: 'email', example: 'rahul@example.com' },
        phone: { type: 'string', example: '+919876543210' },
        avatar_url: { type: 'string', format: 'uri', example: 'https://cdn.kontafy.com/avatars/abc.png' },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      avatar_url?: string;
    },
  ) {
    return this.profileService.updateProfile(user.sub, body);
  }

  @Patch('password')
  @ApiOperation({
    summary: 'Change password',
    description:
      'Self-service password change for the authenticated user. The `current_password` is verified before the new one is applied — passing the wrong current password returns 401. Equivalent to `POST /auth/change-password`.',
  })
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
    @Body()
    body: {
      current_password: string;
      new_password: string;
    },
  ) {
    return this.profileService.changePassword(user.sub, body);
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'Upload a new avatar image (data URL)',
    description:
      'Accepts a base64 data URL, uploads the decoded image to R2 storage, and persists the public URL on the user record as `avatar_url`. The previous avatar is replaced (not deleted from storage) — old keys are reaped by a periodic cleanup job.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['data_url'],
      properties: {
        data_url: {
          type: 'string',
          description: 'Image as a base64 data URL',
          example: 'data:image/png;base64,iVBORw0KGgo...',
        },
      },
    },
  })
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { data_url: string },
  ) {
    return this.profileService.uploadAvatar(user.sub, body?.data_url);
  }
}
