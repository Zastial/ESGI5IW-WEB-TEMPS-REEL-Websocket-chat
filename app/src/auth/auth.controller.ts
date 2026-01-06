import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: { username: string; password: string }) {
    const { username, password } = loginDto;

    if (!username || !password) {
      throw new UnauthorizedException('Username and password are required');
    }

    const validation = this.authService.validateCredentials(username, password);

    if (!validation.valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.authService.generateJWT(username, validation.role!);

    return {
      token,
      username,
      role: validation.role,
    };
  }
}
