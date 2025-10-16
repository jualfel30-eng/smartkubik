import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import * as express from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(express.json({ 
    limit: '50mb',
    verify: (req, res, buf) => {
      req['rawBody'] = buf;
    },
  }));

  app.use(express.urlencoded({ 
    limit: '50mb', 
    extended: true, 
    verify: (req, res, buf) => {
      req['rawBody'] = buf;
    },
  }));

  await configureApp(app, {
    includeSwagger: true,
    runSeeder: process.env.NODE_ENV !== "test",
    setGlobalPrefix: true,
  });

  // Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
