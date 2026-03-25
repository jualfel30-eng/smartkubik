import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface HkaMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export interface HkaHealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  successRate: number;
  avgResponseTime: number;
  lastCheck: Date;
  alerts: string[];
}

/**
 * Servicio de monitoreo y salud de la integración con HKA Factory
 *
 * Características:
 * - Tracking de métricas en tiempo real
 * - Cálculo de tasa de éxito
 * - Detección de degradación del servicio
 * - Alertas automáticas
 */
@Injectable()
export class HkaHealthService {
  private readonly logger = new Logger(HkaHealthService.name);

  private metrics: HkaMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
  };

  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_TIMES = 100; // Últimas 100 requests
  private startTime: Date = new Date();

  /**
   * Registra una solicitud exitosa a HKA Factory
   */
  recordSuccess(responseTimeMs: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.recordResponseTime(responseTimeMs);

    this.logger.debug(`✅ HKA Request Success (${responseTimeMs}ms)`);
  }

  /**
   * Registra una solicitud fallida a HKA Factory
   */
  recordFailure(error: string, responseTimeMs?: number): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastError = error;
    this.metrics.lastErrorTime = new Date();

    if (responseTimeMs) {
      this.recordResponseTime(responseTimeMs);
    }

    this.logger.error(`❌ HKA Request Failed: ${error}`);

    // Verificar si necesitamos alertar
    this.checkAndAlert();
  }

  /**
   * Registra el tiempo de respuesta
   */
  private recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);

    // Mantener solo las últimas N mediciones
    if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
      this.responseTimes.shift();
    }

    // Recalcular promedio
    this.metrics.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;
  }

  /**
   * Obtiene el estado de salud actual
   */
  getHealthCheck(): HkaHealthCheck {
    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 100;

    const uptime = Date.now() - this.startTime.getTime();
    const alerts: string[] = [];

    // Determinar estado
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';

    if (successRate < 50) {
      status = 'down';
      alerts.push('🔴 Tasa de éxito < 50% - Servicio crítico');
    } else if (successRate < 90) {
      status = 'degraded';
      alerts.push('🟡 Tasa de éxito < 90% - Servicio degradado');
    }

    if (this.metrics.averageResponseTime > 10000) {
      status = status === 'healthy' ? 'degraded' : status;
      alerts.push('🟡 Tiempo de respuesta promedio > 10s');
    }

    if (this.metrics.failedRequests > 10 && successRate < 95) {
      alerts.push(`⚠️ ${this.metrics.failedRequests} solicitudes fallidas`);
    }

    return {
      status,
      uptime,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(this.metrics.averageResponseTime),
      lastCheck: new Date(),
      alerts,
    };
  }

  /**
   * Obtiene las métricas detalladas
   */
  getMetrics(): HkaMetrics {
    return {
      ...this.metrics,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
    };
  }

  /**
   * Reinicia las métricas (útil para testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };
    this.responseTimes = [];
    this.startTime = new Date();

    this.logger.log('📊 Métricas HKA reiniciadas');
  }

  /**
   * Verifica métricas y genera alertas si es necesario
   */
  private checkAndAlert(): void {
    const health = this.getHealthCheck();

    if (health.status === 'down') {
      this.logger.error(
        `🚨 ALERTA CRÍTICA HKA: Servicio caído - Tasa de éxito: ${health.successRate}%`,
      );
      // Aquí se podría integrar con sistemas de alertas (Slack, email, etc.)
    } else if (health.status === 'degraded') {
      this.logger.warn(
        `⚠️ ALERTA HKA: Servicio degradado - Tasa de éxito: ${health.successRate}%`,
      );
    }

    // Alerta si hay muchos fallos consecutivos
    if (this.metrics.failedRequests > 5) {
      const recentFailures = this.metrics.failedRequests;
      const total = this.metrics.totalRequests;

      if (recentFailures / total > 0.1) {
        // Más del 10% de fallos
        this.logger.warn(
          `⚠️ Alta tasa de fallos HKA: ${recentFailures}/${total} (${Math.round((recentFailures / total) * 100)}%)`,
        );
      }
    }
  }

  /**
   * Job que se ejecuta cada hora para log de estadísticas
   */
  @Cron(CronExpression.EVERY_HOUR)
  logHourlyStats(): void {
    if (this.metrics.totalRequests === 0) {
      return; // No hay datos para reportar
    }

    const health = this.getHealthCheck();

    this.logger.log(
      `📊 Estadísticas HKA (última hora):
      - Estado: ${health.status.toUpperCase()}
      - Total requests: ${this.metrics.totalRequests}
      - Tasa de éxito: ${health.successRate}%
      - Tiempo promedio: ${health.avgResponseTime}ms
      - Uptime: ${Math.round(health.uptime / 1000 / 60)} minutos`,
    );

    if (health.alerts.length > 0) {
      this.logger.warn(`Alertas activas:\n${health.alerts.join('\n')}`);
    }
  }

  /**
   * Obtiene un reporte completo para dashboard
   */
  getDashboardData(): {
    health: HkaHealthCheck;
    metrics: HkaMetrics;
    recentResponseTimes: number[];
  } {
    return {
      health: this.getHealthCheck(),
      metrics: this.getMetrics(),
      recentResponseTimes: [...this.responseTimes].slice(-20), // Últimos 20
    };
  }
}
