import { Controller, Post, UseGuards } from "@nestjs/common";
import { SeederService } from "../../database/seeds/seeder.service";

@Controller("api/v1/seeding")
export class SeedingController {
  constructor(private readonly seederService: SeederService) {}

  @Post("migrations")
  async runMigrations() {
    await this.seederService.runMigrations();
    return {
      success: true,
      message: "Migrations executed successfully",
    };
  }
}
