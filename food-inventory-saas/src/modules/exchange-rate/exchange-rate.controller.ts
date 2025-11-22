import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ExchangeRateService } from "./exchange-rate.service";

@Controller("exchange-rate")
@UseGuards(JwtAuthGuard)
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get("bcv")
  async getBCVRate(): Promise<any> {
    return this.exchangeRateService.getBCVRate();
  }
}
