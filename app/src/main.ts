import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: false,
    },
  });

  await app.listen(3000);
}

bootstrap().catch((err) => {
  console.error('Erreur au démarrage de l’application :', err);
});
