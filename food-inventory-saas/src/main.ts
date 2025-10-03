import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, BadRequestException } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import * as compression from "compression";
import { ValidationError } from "class-validator";
import { ConfigService } from '@nestjs/config';
import { SeederService } from './database/seeds/seeder.service';
import { logFeatureStatus } from './config/features.config';

// Helper function to format validation errors
function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      for (const key in error.constraints) {
        messages.push(`Property ${error.property} - ${error.constraints[key]}`);
      }
    }
    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children));
    }
  }
  return messages;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Para Swagger UI
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Para permitir imágenes externas
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(compression());

  // Dynamic CORS from .env
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = corsOrigin ? corsOrigin.split(',') : [];

  app.enableCors({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });
  app.enableShutdownHooks();

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = formatValidationErrors(errors);
        console.error("Validation errors:", messages);
        return new BadRequestException(messages);
      },
    }),
  );

  // API Prefix
  app.setGlobalPrefix("api/v1");

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("Food Inventory SaaS API")
    .setDescription("API para sistema de inventario alimentario en Venezuela")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Run database seeds (only in development)
  try {
    const seederService = app.get(SeederService);
    await seederService.seed();
  } catch (error) {
    console.error('Failed to get SeederService:', error.message);
  }

  // Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);

  // Log feature flags status
  logFeatureStatus();
}
bootstrap();