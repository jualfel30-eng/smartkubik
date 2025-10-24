import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import helmet from "helmet";
import type { HelmetOptions } from "helmet";
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

function parseBooleanEnv(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  switch (value.toLowerCase().trim()) {
    case "1":
    case "true":
    case "yes":
    case "y":
      return true;
    default:
      return false;
  }
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function isSeederEnabledFromEnv(): boolean {
  return parseBooleanEnv(process.env.RUN_SEEDER ?? process.env.ENABLE_SEEDS);
}

function resolveHstsOptions(): HelmetOptions["hsts"] {
  if (parseBooleanEnv(process.env.DISABLE_HSTS)) {
    return false;
  }

  const includeSubDomains =
    process.env.HSTS_INCLUDE_SUBDOMAINS === undefined
      ? true
      : parseBooleanEnv(process.env.HSTS_INCLUDE_SUBDOMAINS);
  const preload =
    process.env.HSTS_PRELOAD === undefined
      ? true
      : parseBooleanEnv(process.env.HSTS_PRELOAD);

  return {
    maxAge: parsePositiveInteger(
      process.env.HSTS_MAX_AGE,
      31536000, // 1 year in seconds
    ),
    includeSubDomains,
    preload,
  };
}

function formatPermissionsPolicy(): string {
  const directiveEntries: Array<[string, string[]]> = [
    ["accelerometer", []],
    ["ambient-light-sensor", []],
    ["autoplay", ["self"]],
    ["camera", []],
    ["display-capture", []],
    ["document-domain", []],
    ["encrypted-media", ["self"]],
    ["fullscreen", ["self"]],
    ["geolocation", []],
    ["gyroscope", []],
    ["magnetometer", []],
    ["microphone", []],
    ["midi", []],
    ["payment", []],
    ["picture-in-picture", ["self"]],
    ["publickey-credentials-get", ["self"]],
    ["screen-wake-lock", []],
    ["sync-xhr", []],
    ["usb", []],
    ["xr-spatial-tracking", []],
  ];

  const serialized = directiveEntries
    .map(([feature, sources]) => {
      if (!sources.length) {
        return `${feature}=()`;
      }
      const formattedSources = sources
        .map((source) => (source === "self" ? "self" : source))
        .join(" ");
      return `${feature}=(${formattedSources})`;
    })
    .join(", ");

  return serialized;
}

function resolveHelmetOptions(): HelmetOptions {
  const helmetOptions: HelmetOptions = {
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
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" },
    dnsPrefetchControl: { allow: false },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  };

  const hstsOptions = resolveHstsOptions();
  if (hstsOptions !== undefined) {
    helmetOptions.hsts = hstsOptions;
  }

  return helmetOptions;
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
  const logger = new Logger("AppSetup");
  const {
    includeSwagger = true,
    runSeeder = isSeederEnabledFromEnv(),
    setGlobalPrefix = true,
  } = options;

  // Security Middlewares
  app.use(helmet(resolveHelmetOptions()));
  const permissionsPolicyHeader = formatPermissionsPolicy();
  app.use((_, response, next) => {
    if (!response.getHeader("Permissions-Policy")) {
      response.setHeader("Permissions-Policy", permissionsPolicyHeader);
    }
    next();
  });
  app.use(compression());

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  const allowedOrigins = corsOrigin ? corsOrigin.split(",") : [];

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
        if (messages.length > 0) {
          logger.warn(`Validation errors: ${messages.join(", ")}`);
        } else {
          logger.warn("Validation errors triggered with no messages");
        }
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
      const seederError = error as Error | undefined;
      const message = seederError?.message ?? "Unknown error";
      logger.error(
        `Failed to run SeederService: ${message}`,
        seederError?.stack,
      );
    }
  }

  if (process.env.NODE_ENV !== "test") {
    logFeatureStatus();
  }
}
