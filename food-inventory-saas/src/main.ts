import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import * as express from "express";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(
    express.json({
      limit: "50mb",
      verify: (req, res, buf) => {
        req["rawBody"] = buf;
      },
    }),
  );

  app.use(
    express.urlencoded({
      limit: "50mb",
      extended: true,
      verify: (req, res, buf) => {
        req["rawBody"] = buf;
      },
    }),
  );

  await configureApp(app, {
    includeSwagger: true,
    runSeeder: process.env.NODE_ENV !== "test",
    setGlobalPrefix: true,
  });

  // Configure Socket.IO adapter with CORS
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  const allowedOrigins = corsOrigin ? corsOrigin.split(",") : [];

  app.useWebSocketAdapter(new IoAdapter(app));

  // Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `WebSocket server configured with CORS origins: ${allowedOrigins.join(", ")}`,
  );
}
bootstrap();
