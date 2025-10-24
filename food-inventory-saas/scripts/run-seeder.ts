import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { SeederService } from "../src/database/seeds/seeder.service";

type ExitCode = 0 | 1;

async function bootstrap(): Promise<ExitCode> {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: console,
  });

  try {
    const seeder = appContext.get(SeederService);
    await seeder.seed();
    return 0;
  } catch (error) {
    console.error("❌ Failed to run database seeder", error);
    return 1;
  } finally {
    await appContext.close();
  }
}

bootstrap()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error("❌ Unexpected error running database seeder", error);
    process.exit(1);
  });
