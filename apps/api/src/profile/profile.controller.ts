import {
  Controller,
  Get,
  Patch,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Update name, email, phone, avatar' })
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
  @ApiOperation({ summary: 'Change password' })
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
}
