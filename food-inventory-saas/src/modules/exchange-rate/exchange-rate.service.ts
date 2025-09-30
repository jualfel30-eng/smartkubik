import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

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
      this.logger.log('Returning cached BCV rate');
      return this.cachedRate;
    }

    try {
      this.logger.log('Fetching BCV rate from API...');
      const response = await axios.get('https://bcvapi.tech/api/v1/dolar', {
        timeout: 5000,
      });

      this.logger.debug('API Response:', JSON.stringify(response.data));

      if (!response.data || !response.data.tasa) {
        this.logger.error('Invalid API response structure:', JSON.stringify(response.data));
        throw new Error('Invalid API response structure');
      }

      const rate = parseFloat(response.data.tasa);
      const fecha = response.data.fecha;

      if (isNaN(rate) || rate <= 0) {
        this.logger.error('Invalid rate value:', rate);
        throw new Error('Invalid rate value');
      }

      // Actualizar cache
      this.cachedRate = {
        rate,
        lastUpdate: new Date(fecha || new Date()),
        source: 'BCV (via bcvapi.tech)',
      };
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

      this.logger.log(`BCV rate updated: ${rate} Bs. (${fecha})`);
      return this.cachedRate;
    } catch (error) {
      this.logger.error('Error fetching BCV rate:', error.message);

      // Si tenemos cache antiguo, usarlo como fallback
      if (this.cachedRate) {
        this.logger.warn('Using stale cached rate as fallback');
        return {
          ...this.cachedRate,
          source: 'BCV (cached - error fetching new data)',
        };
      }

      // Como último recurso, usar una tasa por defecto (actualizar manualmente)
      this.logger.warn('Using default fallback rate');
      const fallbackRate = {
        rate: 52.00, // Actualizar este valor manualmente cuando sea necesario
        lastUpdate: new Date(),
        source: 'BCV (fallback rate - API unavailable)',
      };

      // Guardar en cache por si acaso
      this.cachedRate = fallbackRate;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

      return fallbackRate;
    }
  }
}