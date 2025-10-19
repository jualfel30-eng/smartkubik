import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog, AuditLogDocument } from "../../schemas/audit-log.schema";

export interface SecurityAlert {
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  message: string;
  details: any;
  ipAddress?: string;
  userId?: string;
  tenantId?: string;
}

@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Log a security event for monitoring
   */
  async logSecurityEvent(alert: SecurityAlert): Promise<void> {
    const { severity, type, message, details, ipAddress, userId, tenantId } =
      alert;

    // Log to application logger
    const logMethod = this.getLogMethod(severity);
    this.logger[logMethod](`[${type}] ${message}`, {
      details,
      ipAddress,
      userId,
      tenantId,
    });

    // Save to audit log
    try {
      await this.auditLogModel.create({
        action: type,
        performedBy: userId || null,
        tenantId: tenantId || null,
        ipAddress: ipAddress || "unknown",
        details: {
          severity,
          message,
          ...details,
        },
      });
    } catch (error) {
      this.logger.error("Failed to save security event to audit log", error);
    }

    // Trigger alerts for high/critical severity
    if (severity === "high" || severity === "critical") {
      await this.triggerAlert(alert);
    }
  }

  /**
   * Log CSP violation
   */
  async logCSPViolation(violation: any, ipAddress: string): Promise<void> {
    await this.logSecurityEvent({
      severity: "medium",
      type: "CSP_VIOLATION",
      message: `Content Security Policy violation detected`,
      details: {
        blockedUri: violation["blocked-uri"],
        violatedDirective: violation["violated-directive"],
        documentUri: violation["document-uri"],
        sourceFile: violation["source-file"],
        lineNumber: violation["line-number"],
      },
      ipAddress,
    });

    // Check for attack patterns
    await this.detectCSPAttackPattern(violation, ipAddress);
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(
    endpoint: string,
    ipAddress: string,
    userId?: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      severity: "medium",
      type: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded for ${endpoint}`,
      details: { endpoint },
      ipAddress,
      userId,
    });

    // Check for brute force attack
    await this.detectBruteForceAttack(ipAddress, endpoint);
  }

  /**
   * Log failed authentication attempt
   */
  async logFailedAuth(
    email: string,
    ipAddress: string,
    reason: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      severity: "low",
      type: "AUTH_FAILED",
      message: `Failed authentication attempt for ${email}`,
      details: { email, reason },
      ipAddress,
    });

    // Check for credential stuffing
    await this.detectCredentialStuffing(ipAddress);
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(
    resource: string,
    userId: string,
    tenantId: string,
    ipAddress: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      severity: "high",
      type: "UNAUTHORIZED_ACCESS",
      message: `Unauthorized access attempt to ${resource}`,
      details: { resource },
      ipAddress,
      userId,
      tenantId,
    });
  }

  /**
   * Log XSS attempt (detected by sanitization)
   */
  async logXSSAttempt(
    field: string,
    payload: string,
    userId: string,
    tenantId: string,
    ipAddress: string,
  ): Promise<void> {
    await this.logSecurityEvent({
      severity: "critical",
      type: "XSS_ATTEMPT",
      message: `XSS attempt detected in field: ${field}`,
      details: {
        field,
        payloadSnippet: payload.substring(0, 100),
      },
      ipAddress,
      userId,
      tenantId,
    });
  }

  /**
   * Detect CSP attack patterns (multiple violations from same IP)
   */
  private async detectCSPAttackPattern(
    violation: any,
    ipAddress: string,
  ): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const violationCount = await this.auditLogModel.countDocuments({
      action: "CSP_VIOLATION",
      ipAddress,
      createdAt: { $gte: oneHourAgo },
    });

    if (violationCount > 10) {
      await this.logSecurityEvent({
        severity: "critical",
        type: "CSP_ATTACK_PATTERN",
        message: `Possible XSS attack: ${violationCount} CSP violations from ${ipAddress}`,
        details: { violationCount },
        ipAddress,
      });
    }
  }

  /**
   * Detect brute force attack (multiple failed logins)
   */
  private async detectBruteForceAttack(
    ipAddress: string,
    endpoint: string,
  ): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const failedAttempts = await this.auditLogModel.countDocuments({
      action: { $in: ["AUTH_FAILED", "RATE_LIMIT_EXCEEDED"] },
      ipAddress,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (failedAttempts > 20) {
      await this.logSecurityEvent({
        severity: "critical",
        type: "BRUTE_FORCE_ATTACK",
        message: `Possible brute force attack: ${failedAttempts} failed attempts from ${ipAddress}`,
        details: { failedAttempts, endpoint },
        ipAddress,
      });
    }
  }

  /**
   * Detect credential stuffing (attacks across multiple accounts)
   */
  private async detectCredentialStuffing(ipAddress: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const logs = await this.auditLogModel
      .find({
        action: "AUTH_FAILED",
        ipAddress,
        createdAt: { $gte: oneHourAgo },
      })
      .select("details");

    const uniqueEmails = new Set(logs.map((log) => log.details?.email));

    if (uniqueEmails.size > 5) {
      await this.logSecurityEvent({
        severity: "critical",
        type: "CREDENTIAL_STUFFING",
        message: `Possible credential stuffing: ${uniqueEmails.size} different accounts from ${ipAddress}`,
        details: { accountCount: uniqueEmails.size },
        ipAddress,
      });
    }
  }

  /**
   * Get security metrics for dashboard
   */
  async getSecurityMetrics(tenantId?: string): Promise<any> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const filter: any = { createdAt: { $gte: last24Hours } };
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    const [
      totalEvents,
      criticalEvents,
      highEvents,
      cspViolations,
      authFailures,
      rateLimitExceeded,
    ] = await Promise.all([
      this.auditLogModel.countDocuments(filter),
      this.auditLogModel.countDocuments({
        ...filter,
        "details.severity": "critical",
      }),
      this.auditLogModel.countDocuments({
        ...filter,
        "details.severity": "high",
      }),
      this.auditLogModel.countDocuments({
        ...filter,
        action: "CSP_VIOLATION",
      }),
      this.auditLogModel.countDocuments({
        ...filter,
        action: "AUTH_FAILED",
      }),
      this.auditLogModel.countDocuments({
        ...filter,
        action: "RATE_LIMIT_EXCEEDED",
      }),
    ]);

    return {
      last24Hours: {
        totalEvents,
        criticalEvents,
        highEvents,
        cspViolations,
        authFailures,
        rateLimitExceeded,
      },
    };
  }

  /**
   * Get recent security alerts
   */
  async getRecentAlerts(limit: number = 50, tenantId?: string): Promise<any[]> {
    const filter: any = {
      "details.severity": { $in: ["high", "critical"] },
    };

    if (tenantId) {
      filter.tenantId = tenantId;
    }

    return this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("action details ipAddress createdAt")
      .lean();
  }

  /**
   * Trigger alert (email, Slack, etc.)
   */
  private async triggerAlert(alert: SecurityAlert): Promise<void> {
    // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
    this.logger.warn(
      `🚨 SECURITY ALERT [${alert.severity}]: ${alert.message}`,
      {
        type: alert.type,
        details: alert.details,
      },
    );

    // Example: Send to Slack webhook
    // await this.sendSlackAlert(alert);

    // Example: Send email to security team
    // await this.sendEmailAlert(alert);
  }

  private getLogMethod(severity: string): "log" | "warn" | "error" {
    switch (severity) {
      case "critical":
      case "high":
        return "error";
      case "medium":
        return "warn";
      default:
        return "log";
    }
  }
}
