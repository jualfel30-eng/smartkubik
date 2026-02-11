import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

interface CurrencyRate {
  rate: number;
  lastUpdate: Date;
  source: string;
}

interface BCVRatesResponse {
  usd: CurrencyRate;
  eur: CurrencyRate;
}

// Backward-compatible single-rate response
interface BCVRateResponse {
  rate: number;
  lastUpdate: Date;
  source: string;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cachedRates: BCVRatesResponse | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 3600000; // 1 hora

  private readonly FALLBACK_USD = 52.0;
  private readonly FALLBACK_EUR = 56.0;

  private readonly HTTP_HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  };

  /**
   * Fetch both USD and EUR rates from BCV.
   * Primary source: DolarAPI /v1/cotizaciones (returns both currencies).
   * Fallback: individual USD APIs + stale cache for EUR.
   */
  async getBCVRates(): Promise<BCVRatesResponse> {
    // Check cache
    if (this.cachedRates && this.cacheExpiry && new Date() < this.cacheExpiry) {
      this.logger.log("Returning cached BCV rates");
      return this.cachedRates;
    }

    // Try primary API: /v1/cotizaciones (returns both USD and EUR)
    try {
      this.logger.log("Fetching BCV rates from DolarAPI Cotizaciones...");
      const response = await axios.get(
        "https://ve.dolarapi.com/v1/cotizaciones",
        { timeout: 5000, headers: this.HTTP_HEADERS },
      );

      const data = Array.isArray(response.data) ? response.data : [];
      const usdEntry = data.find(
        (d: any) => d.fuente === "oficial" || d.moneda === "USD",
      );
      const eurEntry = data.find(
        (d: any) => d.fuente === "euro" || d.moneda === "EUR",
      );

      const usdRate = parseFloat(usdEntry?.promedio);
      const eurRate = parseFloat(eurEntry?.promedio);

      if (!isNaN(usdRate) && usdRate > 0 && !isNaN(eurRate) && eurRate > 0) {
        const now = new Date();
        this.cachedRates = {
          usd: {
            rate: usdRate,
            lastUpdate: new Date(usdEntry.fechaActualizacion || now),
            source: "BCV (via DolarAPI Cotizaciones)",
          },
          eur: {
            rate: eurRate,
            lastUpdate: new Date(eurEntry.fechaActualizacion || now),
            source: "BCV (via DolarAPI Cotizaciones)",
          },
        };
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);
        this.logger.log(
          `BCV rates updated: USD=${usdRate}, EUR=${eurRate} Bs.`,
        );
        return this.cachedRates;
      }

      this.logger.warn("Cotizaciones API returned invalid rates, trying fallback APIs...");
    } catch (error) {
      this.logger.warn(
        `Error fetching from DolarAPI Cotizaciones: ${error.message}`,
      );
    }

    // Fallback: try individual USD APIs (EUR will use stale cache or fallback)
    const usdApis = [
      {
        name: "DolarAPI Venezuela",
        url: "https://ve.dolarapi.com/v1/dolares/oficial",
        parser: (data: any) => ({
          rate: parseFloat(data.promedio),
          fecha: data.fechaActualizacion,
        }),
      },
      {
        name: "BCV Monitor",
        url: "https://pydolarve.org/api/v1/dollar?page=bcv",
        parser: (data: any) => ({
          rate: parseFloat(data.monitors?.bcv?.price || data.price),
          fecha: data.monitors?.bcv?.last_update || data.last_update,
        }),
      },
    ];

    for (const api of usdApis) {
      try {
        this.logger.log(`Fetching USD rate from ${api.name}...`);
        const response = await axios.get(api.url, {
          timeout: 5000,
          headers: this.HTTP_HEADERS,
        });

        const { rate, fecha } = api.parser(response.data);

        if (isNaN(rate) || rate <= 0) {
          this.logger.warn(`Invalid USD rate from ${api.name}: ${rate}`);
          continue;
        }

        const now = new Date();
        const eurFallback = this.cachedRates?.eur || {
          rate: this.FALLBACK_EUR,
          lastUpdate: now,
          source: "BCV (EUR fallback - cotizaciones unavailable)",
        };

        this.cachedRates = {
          usd: {
            rate,
            lastUpdate: new Date(fecha || now),
            source: `BCV (via ${api.name})`,
          },
          eur: eurFallback,
        };
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);
        this.logger.log(`USD rate updated: ${rate} Bs. from ${api.name}`);
        return this.cachedRates;
      } catch (error) {
        this.logger.warn(
          `Error fetching from ${api.name}: ${error.message}`,
        );
      }
    }

    // All APIs failed: use stale cache
    if (this.cachedRates) {
      this.logger.warn(
        "All APIs failed. Using stale cached rates as fallback",
      );
      return {
        usd: {
          ...this.cachedRates.usd,
          source: "BCV (cached - all APIs unavailable)",
        },
        eur: {
          ...this.cachedRates.eur,
          source: "BCV (cached - all APIs unavailable)",
        },
      };
    }

    // Last resort: hardcoded fallback
    this.logger.warn(
      "All APIs failed and no cache available. Using default fallback rates",
    );
    const now = new Date();
    this.cachedRates = {
      usd: {
        rate: this.FALLBACK_USD,
        lastUpdate: now,
        source: "BCV (fallback rate - all APIs unavailable)",
      },
      eur: {
        rate: this.FALLBACK_EUR,
        lastUpdate: now,
        source: "BCV (fallback rate - all APIs unavailable)",
      },
    };
    this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);
    return this.cachedRates;
  }

  /**
   * Backward-compatible: returns only the USD rate.
   * Used by services that don't need multi-currency.
   */
  async getBCVRate(): Promise<BCVRateResponse> {
    const rates = await this.getBCVRates();
    return rates.usd;
  }

  /**
   * Returns the BCV rate for a specific currency (USD or EUR).
   */
  async getRateForCurrency(currency: string): Promise<CurrencyRate> {
    const rates = await this.getBCVRates();
    if (currency === "EUR") return rates.eur;
    return rates.usd;
  }
}
