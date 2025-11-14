import { Controller, Get, Headers } from "@nestjs/common";
import { Public } from "../../decorators/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Get("debug-token")
  debugToken(@Headers("authorization") authHeader: string) {
    let tokenInfo: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = Buffer.from(parts[1], "base64").toString("utf8");
          const decoded = JSON.parse(payload);
          tokenInfo = {
            hasRole: !!decoded?.role,
            roleName: decoded?.role?.name,
            hasPermissions: Array.isArray(decoded?.role?.permissions),
            permissionsCount: decoded?.role?.permissions?.length || 0,
            permissions: decoded?.role?.permissions || [],
            email: decoded?.email,
            sub: decoded?.sub,
            tenantId: decoded?.tenantId,
          };
        }
      } catch (error) {
        tokenInfo = { error: "Invalid token", message: error.message };
      }
    }

    return {
      message: "Health endpoint - completely public",
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader
        ? authHeader.substring(0, 30) + "..."
        : null,
      tokenInfo,
    };
  }
}
