import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
