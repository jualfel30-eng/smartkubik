import { Injectable } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Request } from "express";

/**
 * Throttler que usa el usuario/tenant cuando está disponible para evitar
 * rate limits por IP compartida. Fallback a IP si no hay JWT.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(context: ExecutionContext): Promise<string> {
    try {
      // Intentar obtener el request HTTP
      const http = context.switchToHttp();
      const req = http.getRequest<Request>();

      if (!req) {
        // Si no hay request, usar un identificador genérico
        return 'non-http-context';
      }

      const user: any = (req as any).user;
      const tenantId = user?.tenantId || user?.tenant?.id;
      const userId = user?.id || user?._id;

      if (tenantId && userId) {
        return `${tenantId}:${userId}`;
      }

      // Fallback: IP (con X-Forwarded-For si existe)
      const xff = (req.headers?.["x-forwarded-for"] as string) || "";
      const ip =
        xff.split(",")[0]?.trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown";
      return `ip:${ip}`;
    } catch (error) {
      // Si falla al obtener contexto HTTP, retornar identificador genérico
      return 'fallback-tracker';
    }
  }

  protected errorMessage = "Too many requests. Please slow down.";
}
