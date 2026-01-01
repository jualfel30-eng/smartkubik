import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from "@nestjs/common";
import helmet from "helmet";
import * as compression from "compression";
import { ValidationError } from "class-validator";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { SeederService } from "./database/seeds/seeder.service";
import { logFeatureStatus } from "./config/features.config";

export interface ConfigureAppOptions {
  includeSwagger?: boolean;
  runSeeder?: boolean;
  setGlobalPrefix?: boolean;
}

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

export async function configureApp(
  app: INestApplication,
  options: ConfigureAppOptions = {},
) {
  const {
    includeSwagger = true,
    runSeeder = process.env.NODE_ENV !== "test",
    setGlobalPrefix = true,
  } = options;

  // Security Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
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
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(compression());

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  const envAllowedOrigins = corsOrigin ? corsOrigin.split(",") : [];

  // En desarrollo, permitir cualquier puerto localhost
  const allowedOrigins =
    process.env.NODE_ENV !== "production"
      ? [
        ...envAllowedOrigins,
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
      ]
      : envAllowedOrigins;

  app.enableCors({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = formatValidationErrors(errors);
        console.error("Validation errors:", messages);
        return new BadRequestException(messages);
      },
    }),
  );

  if (setGlobalPrefix) {
    app.setGlobalPrefix("api/v1");
  }

  if (includeSwagger) {
    const config = new DocumentBuilder()
      .setTitle("Food Inventory SaaS API")
      .setDescription("API para sistema de inventario alimentario en Venezuela")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  if (runSeeder) {
    try {
      const seederService = app.get(SeederService);
      await seederService.seed();
    } catch (error) {
      console.error("Failed to run SeederService:", error.message);
    }
  }

  if (process.env.NODE_ENV !== "test") {
    logFeatureStatus();
  }
}
