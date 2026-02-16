import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CountryPluginService } from './country-plugin.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';

@ApiTags('country-plugins')
@Controller('country-plugins')
@UseGuards(JwtAuthGuard)
export class CountryPluginController {
  constructor(
    private readonly countryPluginService: CountryPluginService,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get country plugin configuration for current tenant' })
  async getConfig(@Req() req: any) {
    const tenant = await this.tenantModel
      .findById(req.user.tenantId)
      .select('countryCode')
      .lean();

    const countryCode = tenant?.countryCode || 'VE';
    const plugin = this.countryPluginService.resolve(countryCode);

    return {
      countryCode: plugin.countryCode,
      countryName: plugin.countryName,
      taxes: {
        defaults: plugin.taxEngine.getDefaultTaxes(),
        exemptDocumentTypes: plugin.taxEngine.getExemptDocumentTypes(),
        withholdingRules: plugin.taxEngine.getWithholdingRules(),
      },
      fiscalIdentity: {
        fieldLabel: plugin.fiscalIdentity.getFieldLabel(),
        idTypes: plugin.fiscalIdentity.getIdTypes().map((t) => ({
          code: t.code,
          name: t.name,
          example: t.example,
        })),
      },
      currency: {
        primary: plugin.currencyEngine.getPrimaryCurrency(),
        secondary: plugin.currencyEngine.getSecondaryCurrencies(),
        exchangeRate: plugin.currencyEngine.getExchangeRateConfig(),
        denominations: {
          [plugin.currencyEngine.getPrimaryCurrency().code]:
            plugin.currencyEngine.getDenominations(
              plugin.currencyEngine.getPrimaryCurrency().code,
            ),
          ...Object.fromEntries(
            plugin.currencyEngine.getSecondaryCurrencies().map((c) => [
              c.code,
              plugin.currencyEngine.getDenominations(c.code),
            ]),
          ),
        },
      },
      paymentMethods: plugin.paymentEngine.getAvailableMethods(),
      supportsGlobalGateways: plugin.paymentEngine.supportsGlobalGateways(),
      eInvoice: {
        required: plugin.eInvoiceProvider.isRequired(),
        authorityName: plugin.eInvoiceProvider.getAuthorityName(),
        authorityBranding: plugin.eInvoiceProvider.getAuthorityBranding(),
      },
      documentTypes: plugin.documentTypes.getTypes(),
      billingChannels: plugin.documentTypes.getChannels(),
      numberingScopes: plugin.documentTypes.getNumberingScopes(),
      locale: {
        language: plugin.localeProvider.getLanguage(),
        timezone: plugin.localeProvider.getTimezone(),
        phonePrefix: plugin.localeProvider.getPhonePrefix(),
        adminDivisionLabel: plugin.localeProvider.getAdminDivisionLabel(),
        dateFormat: plugin.localeProvider.getDateFormat(),
        numberLocale: plugin.localeProvider.getNumberLocale(),
      },
    };
  }

  @Get('countries')
  @ApiOperation({ summary: 'List all available countries' })
  async getCountries() {
    return this.countryPluginService.getAvailableCountries();
  }
}
