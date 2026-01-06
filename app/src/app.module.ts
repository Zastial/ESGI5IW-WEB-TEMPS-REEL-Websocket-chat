import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MessageGateway } from './websocket/message.gateway';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'clients'),
      serveRoot: '/front',
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [MessageGateway],
})
export class AppModule {}
