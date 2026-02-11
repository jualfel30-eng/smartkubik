import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ExchangeRateService } from "./exchange-rate.service";

@Controller("exchange-rate")
@UseGuards(JwtAuthGuard)
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get("bcv")
  async getBCVRate(): Promise<any> {
    const rates = await this.exchangeRateService.getBCVRates();
    // Dual response: backward-compatible top-level fields (USD) + both currencies
    return {
      rate: rates.usd.rate,
      lastUpdate: rates.usd.lastUpdate,
      source: rates.usd.source,
      usd: rates.usd,
      eur: rates.eur,
    };
  }
}
