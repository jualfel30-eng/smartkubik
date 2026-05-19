import { Injectable } from "@nestjs/common";

@Injectable()
export class EduDashboardService {
  async getDashboard(tenantId: string) {
    return { tenantId, message: "Education dashboard — Fase 5 pendiente" };
  }
}
