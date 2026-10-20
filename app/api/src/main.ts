import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({ origin: config.get<string>('PORTAL_URL') });

  // Hosts like Railway inject PORT; locally API_PORT keeps it apart from the portal
  await app.listen(config.get('API_PORT') ?? config.get('PORT') ?? 3000);
}
await bootstrap();
