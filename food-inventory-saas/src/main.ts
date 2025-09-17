import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { ValidationError } from 'class-validator';

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

  // Middlewares
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // O tu frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.enableShutdownHooks();

  // Global Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = formatValidationErrors(errors);
      console.error('Validation errors:', messages);
      return new BadRequestException(messages);
    },
  }));

  // API Prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Food Inventory SaaS API')
    .setDescription('API para sistema de inventario alimentario en Venezuela')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();


