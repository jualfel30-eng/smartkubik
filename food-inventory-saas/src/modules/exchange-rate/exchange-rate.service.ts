import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

interface BCVRateResponse {
  rate: number;
  lastUpdate: Date;
  source: string;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cachedRate: BCVRateResponse | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 3600000; // 1 hora

  async getBCVRate(): Promise<BCVRateResponse> {
    // Verificar si tenemos cache válido
    if (this.cachedRate && this.cacheExpiry && new Date() < this.cacheExpiry) {
      this.logger.log("Returning cached BCV rate");
      return this.cachedRate;
    }

    // Intentar múltiples APIs en orden
    const apis = [
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

    for (const api of apis) {
      try {
        this.logger.log(`Fetching BCV rate from ${api.name}...`);
        const response = await axios.get(api.url, {
          timeout: 5000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
        });

        this.logger.debug(
          `${api.name} Response:`,
          JSON.stringify(response.data),
        );

        const { rate, fecha } = api.parser(response.data);

        if (isNaN(rate) || rate <= 0) {
          this.logger.warn(`Invalid rate from ${api.name}: ${rate}`);
          continue;
        }

        // Actualizar cache
        this.cachedRate = {
          rate,
          lastUpdate: new Date(fecha || new Date()),
          source: `BCV (via ${api.name})`,
        };
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

        this.logger.log(
          `BCV rate updated: ${rate} Bs. (${fecha}) from ${api.name}`,
        );
        return this.cachedRate;
      } catch (error) {
        this.logger.warn(`Error fetching from ${api.name}: ${error.message}`);
        // Continuar con la siguiente API
      }
    }

    // Si todas las APIs fallaron, usar cache antiguo o fallback
    if (this.cachedRate) {
      this.logger.warn("All APIs failed. Using stale cached rate as fallback");
      return {
        ...this.cachedRate,
        source: "BCV (cached - all APIs unavailable)",
      };
    }

    // Como último recurso, usar una tasa por defecto (actualizar manualmente)
    this.logger.warn(
      "All APIs failed and no cache available. Using default fallback rate",
    );
    const fallbackRate = {
      rate: 52.0, // Actualizar este valor manualmente cuando sea necesario
      lastUpdate: new Date(),
      source: "BCV (fallback rate - all APIs unavailable)",
    };

    // Guardar en cache por si acaso
    this.cachedRate = fallbackRate;
    this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

    return fallbackRate;
  }
}
