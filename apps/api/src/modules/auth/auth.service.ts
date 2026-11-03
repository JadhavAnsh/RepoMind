import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    return {
      user: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      message: 'Account created successfully',
    };
  }

  async login(dto: LoginDto) {
    return {
      accessToken: 'dummy-access-token',
      user: {
        email: dto.email,
      },
    };
  }

  async getMe(userId: string) {
    return {
      id: userId,
      status: 'active',
    };
  }
}
