import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ExchangeRateService } from "./exchange-rate.service";
import { CountryPluginService } from "../../country-plugins/country-plugin.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";

@Controller("exchange-rate")
@UseGuards(JwtAuthGuard)
export class ExchangeRateController {
  constructor(
    private readonly exchangeRateService: ExchangeRateService,
    private readonly countryPluginService: CountryPluginService,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  @Get("bcv")
  async getBCVRate(): Promise<any> {
    return this.exchangeRateService.getBCVRate();
  }

  @Get("current")
  async getCurrentRate(@Req() req: any): Promise<any> {
    const tenant = await this.tenantModel
      .findById(req.user.tenantId)
      .select("countryCode")
      .lean();

    const countryCode = tenant?.countryCode || "VE";
    const plugin = this.countryPluginService.resolve(countryCode);
    const config = plugin.currencyEngine.getExchangeRateConfig();

    if (!config) {
      return { rate: 1, lastUpdate: new Date(), source: "none" };
    }

    // For VE (BCV), delegate to existing service
    if (config.source === "BCV") {
      return this.exchangeRateService.getBCVRate();
    }

    // Future: other country rate sources
    return { rate: 1, lastUpdate: new Date(), source: config.source };
  }
}
