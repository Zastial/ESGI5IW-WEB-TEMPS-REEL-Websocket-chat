import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JWTPayload {
  username: string;
  role: string;
  iat?: number;
}

@Injectable()
export class AuthService {
  private readonly validUsers: Record<
    string,
    { password: string; role: string }
  >;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.validUsers = {
      admin: {
        password: this.configService.get<string>('ADMIN_PASSWORD')!,
        role: 'ADMIN',
      },
      user: {
        password: this.configService.get<string>('USER_PASSWORD')!,
        role: 'USER',
      },
    };
  }

  generateJWT(username: string, role: string): string {
    const payload: JWTPayload = {
      username,
      role,
    };
    return this.jwtService.sign(payload);
  }

  decodeJWT(token: string): JWTPayload | null {
    try {
      const payload = this.jwtService.verify(token);
      return payload as JWTPayload;
    } catch {
      return null;
    }
  }

  validateCredentials(
    username: string,
    password: string,
  ): { valid: boolean; role?: string } {
    const user = this.validUsers[username.toLowerCase()];
    if (user?.password === password) {
      return { valid: true, role: user.role };
    }
    return { valid: false };
  }
}
