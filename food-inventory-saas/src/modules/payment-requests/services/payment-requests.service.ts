import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import {
  TenantPaymentConfig,
  TenantPaymentConfigDocument,
} from "../../../schemas/tenant-payment-config.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { PaymentsService } from "../../payments/payments.service";
import {
  PAYMENT_REQUEST_STATUSES,
  PaymentProofMethod,
  PaymentRequest,
  PaymentRequestDocument,
  PaymentRequestEntityType,
  PaymentRequestRejectReason,
  PaymentRequestStatus,
} from "../schemas/payment-request.schema";
import { CreatePaymentRequestDto } from "../dto/create-payment-request.dto";
import { ListPaymentRequestsDto } from "../dto/list-payment-requests.dto";
import { PublicPaymentInfoDto } from "../dto/public-payment-info.dto";
import { AcceptProofDto, RejectProofDto } from "../dto/review-proof.dto";
import { SubmitProofDto } from "../dto/submit-proof.dto";
import {
  PAYMENT_PROOF_STORAGE,
  PaymentProofStorageAdapter,
} from "./payment-proof-storage.service";
import {
  ImageOptimizerService,
  OptimizedImage,
} from "./image-optimizer.service";
import {
  PAYMENT_PORTAL_SCOPE,
  PaymentTokenService,
} from "./payment-token.service";
import { PaymentRequestNotificationsService } from "./payment-request-notifications.service";
import { normalizeWhatsAppPhone } from "../../../utils/phone.util";

interface ActorContext {
  kind: "customer" | "tenant" | "system";
  userId?: string;
}

const TENANT_ACTIONABLE_TRANSITIONS: Record<
  PaymentRequestStatus,
  PaymentRequestStatus[]
> = {
  pending: [],
  submitted: [
    "confirmed",
    "info_mismatch",
    "proof_unclear",
    "partial",
    "awaiting_settlement",
    "rejected_final",
  ],
  awaiting_settlement: ["confirmed", "rejected_final"],
  info_mismatch: [],
  proof_unclear: [],
  partial: [],
  confirmed: [],
  rejected_final: [],
  expired: [],
};

const CUSTOMER_RESUBMIT_FROM: PaymentRequestStatus[] = [
  "pending",
  "info_mismatch",
  "proof_unclear",
  "partial",
];

const REJECT_REASON_TO_STATUS: Record<
  PaymentRequestRejectReason,
  PaymentRequestStatus
> = {
  info_mismatch: "info_mismatch",
  proof_unclear: "proof_unclear",
  partial: "partial",
  awaiting_settlement: "awaiting_settlement",
  rejected_final: "rejected_final",
};

@Injectable()
export class PaymentRequestsService {
  private readonly logger = new Logger(PaymentRequestsService.name);

  constructor(
    @InjectModel(PaymentRequest.name)
    private readonly paymentRequestModel: Model<PaymentRequestDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(TenantPaymentConfig.name)
    private readonly tenantPaymentConfigModel: Model<TenantPaymentConfigDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly tokenService: PaymentTokenService,
    private readonly imageOptimizer: ImageOptimizerService,
    @Inject(PAYMENT_PROOF_STORAGE)
    private readonly storage: PaymentProofStorageAdapter,
    private readonly notifications: PaymentRequestNotificationsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ════════════════════════════════════════════════════════════════════════
  // Creation
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Tenant-side or listener-side creation. Returns the saved doc plus a
   * fresh portal URL for the caller to deliver / display.
   */
  async create(
    tenantId: string,
    dto: CreatePaymentRequestDto,
    actor: ActorContext,
  ): Promise<{ paymentRequest: PaymentRequestDocument; portalUrl: string }> {
    const config = await this.loadTenantPaymentConfig(tenantId);
    const {
      snapshot,
      amountDue,
      currency,
      exchangeRate,
      customerPhone,
      allowMethodOverride,
    } = await this.resolveEntitySnapshot(tenantId, dto.entityType, dto.entityId);

    const selectedMethod = await this.resolveSelectedMethod(
      tenantId,
      dto.methodId,
    );
    const expiresAt = this.computeExpiresAt(config.paymentRequestExpiryDays);

    // Build the doc first so we have an _id to embed in the token.
    const pr = new this.paymentRequestModel({
      tenantId: new Types.ObjectId(tenantId),
      entityType: dto.entityType,
      entityId: new Types.ObjectId(dto.entityId),
      entitySnapshot: snapshot,
      amountDue,
      currency,
      // Freeze the exchange rate at creation so VES amounts shown on the
      // portal stay consistent even if BCV moves while the PR is open.
      // Falls back to undefined when the order didn't carry totalAmountVes
      // (older / 0-value orders) — portal degrades to USD-only display.
      exchangeRateSnapshot: exchangeRate,
      selectedMethod,
      allowMethodOverride:
        dto.allowMethodOverride ?? allowMethodOverride ?? false,
      allowPartialPayments: config.allowPartialPayments ?? false,
      expiresAt,
      status: "pending",
      delivery: { channel: "pending_manual", deliveryAttempts: 0 },
      token: "PENDING", // placeholder, replaced after we have an _id
      createdBy: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
      events: [
        {
          at: new Date(),
          actor: actor.kind,
          actorId: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
          type: "created",
          payload: {
            entityType: dto.entityType,
            entityId: dto.entityId,
            methodId: selectedMethod.methodId,
          },
        },
      ],
    });

    const ttlSeconds = Math.max(
      60,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
    pr.token = this.tokenService.sign(
      {
        scope: PAYMENT_PORTAL_SCOPE,
        paymentRequestId: pr._id.toString(),
        tenantId,
      },
      ttlSeconds,
    );

    await pr.save();

    // Attempt delivery (best-effort — never block creation on it)
    const phoneToTry = dto.deliveryPhone || customerPhone;
    const wantsWhatsApp = (dto.deliveryChannel ?? "whatsapp") === "whatsapp";

    if (wantsWhatsApp && phoneToTry) {
      await this.attemptWhatsappDelivery(pr, phoneToTry);
    } else if (phoneToTry === undefined || !wantsWhatsApp) {
      pr.delivery.channel = "manual";
      pr.events.push({
        at: new Date(),
        actor: actor.kind,
        type: "delivery.skipped",
        payload: { reason: wantsWhatsApp ? "no_phone" : "manual_requested" },
      });
      await pr.save();
    }

    const portalUrl = this.buildPortalUrl(pr.token);

    this.logger.log(
      `Created PaymentRequest ${pr._id} for tenant=${tenantId} entity=${dto.entityType}:${dto.entityId} status=${pr.status} delivery=${pr.delivery.channel}`,
    );

    return { paymentRequest: pr, portalUrl };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Public portal — proof submission
  // ════════════════════════════════════════════════════════════════════════

  async submitProof(
    pr: PaymentRequestDocument,
    dto: SubmitProofDto,
    file: { buffer: Buffer; mimetype?: string; size?: number },
  ): Promise<PaymentRequestDocument> {
    if (!CUSTOMER_RESUBMIT_FROM.includes(pr.status)) {
      throw new ConflictException(
        `No es posible enviar comprobante en estado ${pr.status}`,
      );
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Falta la imagen del comprobante");
    }

    // 1. Optimize + hash
    const optimized: OptimizedImage = await this.imageOptimizer.optimize(
      file.buffer,
    );

    // 2. Pre-mint a proof _id so the storage layout is deterministic before
    //    saving the doc — avoids a second update round-trip.
    const proofId = new Types.ObjectId();

    // 3. Persist the optimized image
    const stored = await this.storage.save({
      tenantId: pr.tenantId.toString(),
      paymentRequestId: pr._id.toString(),
      proofId: proofId.toString(),
      buffer: optimized.buffer,
    });

    // 4. Append proof + audit event, transition → submitted
    pr.proofs.push({
      _id: proofId,
      submittedAt: new Date(),
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method,
      originBank: dto.originBank,
      payerIdNumber: dto.payerIdNumber,
      payerPhone: dto.payerPhone,
      referenceNumber: dto.referenceNumber,
      imageUrl: stored.url,
      imageHash: optimized.hash,
      reviewStatus: "pending",
    } as any);

    pr.events.push({
      at: new Date(),
      actor: "customer",
      type: "proof.submitted",
      payload: {
        proofId: proofId.toString(),
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        bytes: optimized.bytes,
        replacesProofId: dto.replacesProofId,
      },
    });

    this.applyStatusTransition(pr, "submitted", "customer");

    await pr.save();

    // Fire-and-forget notification — never block the customer's submit
    void this.notifications.notifyProofSubmitted(pr).catch((err) =>
      this.logger.error(
        `Failed to fan out submitted notification for PR ${pr._id}: ${err.message}`,
      ),
    );

    return pr;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Review (tenant-side)
  // ════════════════════════════════════════════════════════════════════════

  async acceptProof(
    tenantId: string,
    paymentRequestId: string,
    proofId: string,
    dto: AcceptProofDto,
    actor: ActorContext,
  ): Promise<PaymentRequestDocument> {
    const pr = await this.findOneOrThrow(tenantId, paymentRequestId);
    const proof = this.getProofOrThrow(pr, proofId);

    if (proof.reviewStatus === "accepted") {
      return pr; // idempotent
    }

    proof.reviewStatus = "accepted";
    proof.reviewedAt = new Date();
    proof.reviewedBy = actor.userId
      ? new Types.ObjectId(actor.userId)
      : undefined;
    proof.reviewNote = dto.note;

    pr.events.push({
      at: new Date(),
      actor: "tenant",
      actorId: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
      type: "proof.accepted",
      payload: { proofId, note: dto.note },
    });

    await pr.save();
    return pr;
  }

  async rejectProof(
    tenantId: string,
    paymentRequestId: string,
    proofId: string,
    dto: RejectProofDto,
    actor: ActorContext,
  ): Promise<PaymentRequestDocument> {
    const pr = await this.findOneOrThrow(tenantId, paymentRequestId);
    const proof = this.getProofOrThrow(pr, proofId);

    const targetStatus = REJECT_REASON_TO_STATUS[dto.reason];
    if (!targetStatus) {
      throw new BadRequestException("Razón de rechazo inválida");
    }

    proof.reviewStatus = "rejected";
    proof.reviewedAt = new Date();
    proof.reviewedBy = actor.userId
      ? new Types.ObjectId(actor.userId)
      : undefined;
    proof.reviewNote = dto.note;

    pr.events.push({
      at: new Date(),
      actor: "tenant",
      actorId: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
      type: "proof.rejected",
      payload: { proofId, reason: dto.reason, note: dto.note },
    });

    this.applyStatusTransition(pr, targetStatus, "tenant");
    await pr.save();

    if (targetStatus !== "awaiting_settlement") {
      // awaiting_settlement is silent to the customer per spec
      void this.notifications
        .notifyStatusChange(pr, {
          reason: dto.reason,
          note: dto.note,
          rejectedProofId: proofId,
        })
        .catch((err) =>
          this.logger.error(
            `Failed to fan out status-change notification for PR ${pr._id}: ${err.message}`,
          ),
        );
    } else {
      void this.notifications.notifyInternalStatusChange(pr).catch(() => {});
    }

    return pr;
  }

  async markAwaitingSettlement(
    tenantId: string,
    paymentRequestId: string,
    actor: ActorContext,
  ): Promise<PaymentRequestDocument> {
    const pr = await this.findOneOrThrow(tenantId, paymentRequestId);
    this.applyStatusTransition(pr, "awaiting_settlement", "tenant");
    pr.events.push({
      at: new Date(),
      actor: "tenant",
      actorId: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
      type: "awaiting_settlement",
      payload: {},
    });
    await pr.save();
    void this.notifications.notifyInternalStatusChange(pr).catch(() => {});
    return pr;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Confirmation — generates Payment ledger records
  // ════════════════════════════════════════════════════════════════════════

  async confirm(
    tenantId: string,
    paymentRequestId: string,
    actor: ActorContext,
  ): Promise<PaymentRequestDocument> {
    if (!actor.userId) {
      throw new BadRequestException(
        "Confirmar pago requiere un usuario autenticado",
      );
    }

    const pr = await this.findOneOrThrow(tenantId, paymentRequestId);

    const acceptedProofs = pr.proofs.filter(
      (p) => p.reviewStatus === "accepted",
    );

    if (acceptedProofs.length === 0) {
      throw new BadRequestException(
        "Acepta al menos un comprobante antes de confirmar",
      );
    }

    const paymentIds: Types.ObjectId[] = [];

    if (pr.entityType !== "order") {
      // PR1 ships order linkage. Appointment/invoice Payment generation
      // requires per-vertical service wiring — they'll land alongside
      // their respective storefront UIs.
      throw new NotImplementedException(
        `Confirmación de PaymentRequest para entityType=${pr.entityType} llegará en un release próximo`,
      );
    }

    const userCtx = { tenantId, id: actor.userId };

    for (const proof of acceptedProofs) {
      const created = await this.paymentsService.create(
        {
          paymentType: "sale",
          orderId: pr.entityId.toString(),
          date: new Date().toISOString(),
          amount: proof.amount,
          currency: proof.currency,
          method:
            pr.selectedMethod.methodId ||
            this.proofMethodToLegacyMethod(proof.method, proof.currency),
          reference: proof.referenceNumber,
          status: "confirmed",
          idempotencyKey: `pr_${pr._id}_${proof._id}`,
        },
        userCtx,
      );
      paymentIds.push(created._id as Types.ObjectId);
    }

    pr.paymentIds.push(...paymentIds);
    pr.events.push({
      at: new Date(),
      actor: "tenant",
      actorId: new Types.ObjectId(actor.userId),
      type: "confirmed",
      payload: { paymentIds: paymentIds.map((id) => id.toString()) },
    });

    this.applyStatusTransition(pr, "confirmed", "tenant");
    await pr.save();

    void this.notifications.notifyConfirmed(pr).catch((err) =>
      this.logger.error(
        `Failed to fan out confirmed notification for PR ${pr._id}: ${err.message}`,
      ),
    );

    return pr;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Resend delivery link (manual retry)
  // ════════════════════════════════════════════════════════════════════════

  async resendDeliveryLink(
    tenantId: string,
    paymentRequestId: string,
    deliveryPhone: string | undefined,
    actor: ActorContext,
  ): Promise<PaymentRequestDocument> {
    const pr = await this.findOneOrThrow(tenantId, paymentRequestId);

    const phone = deliveryPhone || pr.delivery.deliveredTo;
    if (!phone) {
      throw new BadRequestException(
        "Indica un teléfono para reenviar el comprobante",
      );
    }

    pr.events.push({
      at: new Date(),
      actor: "tenant",
      actorId: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
      type: "delivery.retried",
      payload: { phone },
    });

    await this.attemptWhatsappDelivery(pr, phone);
    await pr.save();
    return pr;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Reads
  // ════════════════════════════════════════════════════════════════════════

  async findForTenant(
    tenantId: string,
    query: ListPaymentRequestsDto,
  ): Promise<{
    data: PaymentRequestDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (query.status) filter.status = query.status;
    if (query.entityType) filter.entityType = query.entityType;

    const [data, total] = await Promise.all([
      this.paymentRequestModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.paymentRequestModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOneForTenant(
    tenantId: string,
    paymentRequestId: string,
  ): Promise<PaymentRequestDocument> {
    return this.findOneOrThrow(tenantId, paymentRequestId);
  }

  async pendingCountForTenant(tenantId: string): Promise<number> {
    return this.paymentRequestModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      status: "submitted",
      isDeleted: { $ne: true },
    });
  }

  /**
   * Daily cron entry point. Marks pending requests past expiresAt as expired.
   * Returns the modified count for logging.
   */
  async expireStale(): Promise<number> {
    const now = new Date();
    const docs = await this.paymentRequestModel.find({
      status: "pending",
      expiresAt: { $lt: now },
      isDeleted: { $ne: true },
    });

    let modified = 0;
    for (const pr of docs) {
      try {
        this.applyStatusTransition(pr, "expired", "system");
        pr.events.push({
          at: new Date(),
          actor: "system",
          type: "expired",
          payload: { expiresAt: pr.expiresAt },
        });
        await pr.save();
        modified += 1;
      } catch (err) {
        this.logger.warn(
          `expireStale: skip PR ${pr._id} (${err.message})`,
        );
      }
    }

    if (modified > 0) {
      this.logger.log(`expireStale: marked ${modified} PaymentRequest(s) as expired`);
    }
    return modified;
  }

  /**
   * Build the public-portal DTO. Called from the controller after the
   * guard already loaded the doc. Hides anything the customer shouldn't see.
   */
  async buildPublicInfo(
    pr: PaymentRequestDocument,
  ): Promise<PublicPaymentInfoDto> {
    const tenant = await this.tenantModel.findById(pr.tenantId).select({
      name: 1,
      logo: 1,
      primaryColor: 1,
    });

    let diagnostic: PublicPaymentInfoDto["diagnostic"] = null;
    if (
      pr.status === "info_mismatch" ||
      pr.status === "proof_unclear" ||
      pr.status === "partial"
    ) {
      // Find the most recent rejection event
      const lastRejection = [...pr.events]
        .reverse()
        .find((e) => e.type === "proof.rejected");
      if (lastRejection) {
        diagnostic = {
          reason: lastRejection.payload?.reason || pr.status,
          note: lastRejection.payload?.note,
          rejectedProofId: lastRejection.payload?.proofId,
          rejectedAt: lastRejection.at?.toISOString(),
        };
      }
    }

    return {
      status: pr.status,
      expiresAt: pr.expiresAt.toISOString(),
      amountDue: pr.amountDue,
      currency: pr.currency,
      exchangeRateSnapshot: pr.exchangeRateSnapshot,
      allowPartialPayments: pr.allowPartialPayments,
      allowMethodOverride: pr.allowMethodOverride,
      entity: {
        type: pr.entityType,
        snapshot: {
          items: pr.entitySnapshot.items.map((i) => ({
            name: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
          subtotal: pr.entitySnapshot.subtotal,
          tax: pr.entitySnapshot.tax,
          total: pr.entitySnapshot.total,
          customerName: pr.entitySnapshot.customerName,
          createdAt: pr.entitySnapshot.createdAt?.toISOString(),
        },
      },
      selectedMethod: {
        type: pr.selectedMethod.type,
        label: pr.selectedMethod.label,
        methodId: pr.selectedMethod.methodId,
        accountDetails: pr.selectedMethod.accountDetails ?? {},
      },
      // Only expose the list when override is allowed. Filter to methods
      // that fit the remote-proof workflow: transfer / pago_movil / zelle.
      // Excluded:
      //   - cash (no proof to upload — the customer is paying remotely)
      //   - card / POS (physical-presence methods)
      //   - pago_mixto (Phase 2 — the form only handles one proof per
      //     submit today; mixed payments need their own multi-proof flow)
      //   - the currently-selected method (no point in "switch to itself")
      availableMethods: pr.allowMethodOverride
        ? (await this.resolveTenantMethods(pr.tenantId.toString()))
            .filter((m) => {
              if (!m.isActive) return false;
              if (m.methodId === pr.selectedMethod.methodId) return false;
              if (/^pago_mixto$/i.test(m.methodId)) return false;
              const type = this.legacyMethodToProofMethod(m.methodId);
              return (
                type === "transfer" ||
                type === "pago_movil" ||
                type === "zelle"
              );
            })
            .map((m) => ({
              type: this.legacyMethodToProofMethod(m.methodId),
              label: m.name,
              methodId: m.methodId,
              accountDetails: m.accountDetails ?? {},
            }))
        : undefined,
      diagnostic,
      tenant: {
        name: (tenant as any)?.name,
        branding: tenant
          ? {
              logoUrl: (tenant as any).logo,
              primaryColor: (tenant as any).primaryColor,
            }
          : undefined,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Method override (customer-driven, gated by allowMethodOverride)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Switch the PR's `selectedMethod` to another active tenant method.
   * Allowed only:
   *   - When the PR's `allowMethodOverride === true` (set at creation time
   *     based on `order.source`)
   *   - When the PR has not yet been submitted (status is one of the
   *     CUSTOMER_RESUBMIT_FROM set — pending / info_mismatch / etc.)
   *
   * Append an audit event. Returns the updated doc so the controller can
   * re-build the public info without a second query.
   */
  async overrideMethod(
    pr: PaymentRequestDocument,
    methodId: string,
  ): Promise<PaymentRequestDocument> {
    if (!pr.allowMethodOverride) {
      throw new ForbiddenException(
        "El cliente no puede cambiar el método de pago para esta solicitud",
      );
    }
    if (!CUSTOMER_RESUBMIT_FROM.includes(pr.status)) {
      throw new ConflictException(
        `No es posible cambiar el método de pago en estado ${pr.status}`,
      );
    }

    const newMethod = await this.resolveSelectedMethod(
      pr.tenantId.toString(),
      methodId,
    );

    // Match the filter applied to `availableMethods` in buildPublicInfo —
    // only remote-proof methods are valid from the portal.
    const newType = this.legacyMethodToProofMethod(newMethod.methodId || "");
    const portalCompatible = ["transfer", "pago_movil", "zelle"];
    if (
      /^pago_mixto$/i.test(newMethod.methodId || "") ||
      !portalCompatible.includes(newType)
    ) {
      throw new BadRequestException(
        "Este método de pago no se puede usar desde el portal",
      );
    }

    const previousMethodId = pr.selectedMethod.methodId;
    pr.selectedMethod = newMethod as any;
    pr.events.push({
      at: new Date(),
      actor: "customer",
      type: "method.overridden",
      payload: {
        from: previousMethodId,
        to: newMethod.methodId,
      },
    });

    await pr.save();
    return pr;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Internal helpers
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Central state-machine guard. Throws ConflictException (409) on any
   * disallowed transition. Customer re-submissions are encoded here rather
   * than scattered through call-sites — single source of truth for
   * what's legal.
   */
  private applyStatusTransition(
    pr: PaymentRequestDocument,
    to: PaymentRequestStatus,
    actor: "customer" | "tenant" | "system",
  ): void {
    if (!PAYMENT_REQUEST_STATUSES.includes(to)) {
      throw new BadRequestException(`Estado destino inválido: ${to}`);
    }

    const from = pr.status;
    if (from === to) return;

    const legal = this.isLegalTransition(from, to, actor);
    if (!legal) {
      throw new ConflictException(
        `Transición no permitida: ${from} → ${to} por ${actor}`,
      );
    }

    pr.status = to;
  }

  private isLegalTransition(
    from: PaymentRequestStatus,
    to: PaymentRequestStatus,
    actor: "customer" | "tenant" | "system",
  ): boolean {
    if (actor === "system") {
      // System can only expire pending requests
      return from === "pending" && to === "expired";
    }

    if (actor === "customer") {
      // Customer submits/resubmits — always lands on "submitted"
      return CUSTOMER_RESUBMIT_FROM.includes(from) && to === "submitted";
    }

    // tenant
    return TENANT_ACTIONABLE_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private async findOneOrThrow(
    tenantId: string,
    paymentRequestId: string,
  ): Promise<PaymentRequestDocument> {
    if (!Types.ObjectId.isValid(paymentRequestId)) {
      throw new NotFoundException("Solicitud de pago no encontrada");
    }

    const pr = await this.paymentRequestModel.findOne({
      _id: new Types.ObjectId(paymentRequestId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    if (!pr) {
      throw new NotFoundException("Solicitud de pago no encontrada");
    }
    return pr;
  }

  private getProofOrThrow(pr: PaymentRequestDocument, proofId: string) {
    if (!Types.ObjectId.isValid(proofId)) {
      throw new NotFoundException("Comprobante no encontrado");
    }
    const proof = pr.proofs.find((p) => p._id?.toString() === proofId);
    if (!proof) {
      throw new NotFoundException("Comprobante no encontrado");
    }
    return proof;
  }

  /**
   * Returns the PR-specific settings, falling back to documented defaults
   * when the tenant has never hit /tenant-payment-config (the common case
   * — admin only writes payment methods to Tenant.settings.paymentMethods,
   * not to this collection). Never throws on missing config so the rest of
   * the flow stays unblocked.
   */
  private async loadTenantPaymentConfig(
    tenantId: string,
  ): Promise<{
    requirePaymentProof: boolean;
    allowPartialPayments: boolean;
    paymentRequestExpiryDays: number;
  }> {
    const config = await this.tenantPaymentConfigModel.findOne({ tenantId });
    return {
      requirePaymentProof: config?.requirePaymentProof ?? false,
      allowPartialPayments: config?.allowPartialPayments ?? false,
      paymentRequestExpiryDays: config?.paymentRequestExpiryDays ?? 7,
    };
  }

  /**
   * Single source of truth for "what payment methods is this tenant
   * accepting today, with their bank info".
   *
   * Reads from `Tenant.settings.paymentMethods` (where the existing admin
   * UI writes — `PaymentMethodsSettings.jsx → PUT /tenant/settings`) and
   * maps the admin's generic field keys (`bank`, `accountNumber`, etc.)
   * onto the per-method-type shape the portal expects in
   * `PaymentRequest.selectedMethod.accountDetails`.
   *
   * Falls back to `TenantPaymentConfig.paymentMethods` only if the admin
   * store is empty — preserves backwards compatibility for tenants who
   * configured methods directly via the dedicated endpoint.
   */
  private async resolveTenantMethods(tenantId: string): Promise<
    Array<{
      methodId: string;
      name: string;
      isActive: boolean;
      accountDetails: Record<string, any>;
    }>
  > {
    const tenant: any = await this.tenantModel
      .findById(tenantId)
      .select({ "settings.paymentMethods": 1 })
      .lean();

    const adminMethods: any[] = tenant?.settings?.paymentMethods || [];

    if (adminMethods.length > 0) {
      return adminMethods.map((m) => ({
        methodId: m.id,
        name: m.name,
        isActive: !!m.enabled,
        accountDetails: this.mapAdminDetailsToAccountDetails(m.id, m.details),
      }));
    }

    // Fallback: legacy direct-endpoint path
    const config = await this.tenantPaymentConfigModel
      .findOne({ tenantId })
      .lean();
    return (config?.paymentMethods || []).map((m: any) => ({
      methodId: m.methodId,
      name: m.name,
      isActive: !!m.isActive,
      accountDetails: m.accountDetails ?? {},
    }));
  }

  /**
   * Translates the admin's flat `details` object into per-method-type
   * `accountDetails` keys that the storefront's PaymentMethodCard reads.
   * Keeps the raw details under `_admin` for forward-compat (future
   * adapters / unmapped fields).
   */
  private mapAdminDetailsToAccountDetails(
    methodId: string,
    details: Record<string, any> | undefined,
  ): Record<string, any> {
    const d = details || {};
    const type = this.legacyMethodToProofMethod(methodId);

    if (type === "transfer") {
      return {
        bankName: d.bank,
        accountNumber: d.accountNumber,
        accountHolderName: d.accountName,
      };
    }
    if (type === "pago_movil") {
      return {
        pagoMovilBank: d.bank,
        pagoMovilPhone: d.phoneNumber,
        pagoMovilCI: d.cid,
      };
    }
    if (type === "zelle") {
      return {
        zelleEmail: d.email,
        zellePhone: d.phoneNumber,
        accountHolderName: d.accountName,
      };
    }
    // cash / card: no bank fields needed
    return {};
  }

  private async resolveSelectedMethod(
    tenantId: string,
    methodId?: string,
  ): Promise<{
    type: PaymentProofMethod;
    accountDetails: Record<string, any>;
    label: string;
    methodId?: string;
  }> {
    const methods = await this.resolveTenantMethods(tenantId);
    const candidates = methods.filter((m) => m.isActive);

    if (candidates.length === 0) {
      throw new BadRequestException(
        "El tenant no tiene métodos de pago activos. Configúralos en Ajustes → Métodos de pago.",
      );
    }

    let chosen;
    if (methodId) {
      chosen = candidates.find((m) => m.methodId === methodId);
      if (!chosen) {
        throw new BadRequestException(
          `Método de pago ${methodId} no está activo en este tenant`,
        );
      }
    } else {
      chosen =
        candidates.find((m) => !/efectivo|cash/i.test(m.methodId)) ||
        candidates[0];
    }

    return {
      type: this.legacyMethodToProofMethod(chosen.methodId),
      accountDetails: chosen.accountDetails ?? {},
      label: chosen.name,
      methodId: chosen.methodId,
    };
  }

  /**
   * Map TenantPaymentConfig.methodId (e.g. "transferencia_usd", "zelle_usd",
   * "pago_movil_ves", "efectivo_usd") to the coarse-grained type stored on
   * PaymentRequest.selectedMethod.type and per-proof method enum.
   */
  private legacyMethodToProofMethod(methodId: string): PaymentProofMethod {
    if (/cash|efectivo/i.test(methodId)) return "cash";
    if (/pago_movil/i.test(methodId)) return "pago_movil";
    if (/zelle/i.test(methodId)) return "zelle";
    if (/transfer/i.test(methodId)) return "transfer";
    if (/card|tarjeta|pos/i.test(methodId)) return "card";
    return "transfer";
  }

  /**
   * Inverse mapping for Payment ledger writes — derives the legacy
   * `method` string when the PaymentRequest doesn't carry a methodId
   * (e.g. when proofs come from a method-override on the portal).
   */
  private proofMethodToLegacyMethod(
    method: PaymentProofMethod,
    currency: "USD" | "VES",
  ): string {
    if (method === "cash") return currency === "VES" ? "efectivo_ves" : "efectivo_usd";
    if (method === "pago_movil") return "pago_movil_ves";
    if (method === "zelle") return "zelle_usd";
    if (method === "transfer")
      return currency === "VES" ? "transferencia_ves" : "transferencia_usd";
    return "transferencia_usd";
  }

  private computeExpiresAt(days: number): Date {
    const safe = Math.min(30, Math.max(1, Math.floor(days || 7)));
    return new Date(Date.now() + safe * 24 * 60 * 60 * 1000);
  }

  private async resolveEntitySnapshot(
    tenantId: string,
    entityType: PaymentRequestEntityType,
    entityId: string,
  ): Promise<{
    snapshot: any;
    amountDue: number;
    currency: "USD" | "VES";
    exchangeRate?: number;
    customerPhone?: string;
    allowMethodOverride?: boolean;
  }> {
    if (entityType !== "order") {
      throw new NotImplementedException(
        `PaymentRequest para entityType=${entityType} llegará en un release próximo`,
      );
    }

    if (!Types.ObjectId.isValid(entityId)) {
      throw new BadRequestException("entityId inválido");
    }

    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(entityId),
      $or: [
        { tenantId },
        { tenantId: new Types.ObjectId(tenantId) },
      ],
    });
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    const snapshot = {
      items: (order.items || []).map((it: any) => ({
        name: it.productName,
        qty: it.quantity ?? 0,
        unitPrice: it.unitPrice ?? 0,
        total: it.totalPrice ?? 0,
      })),
      subtotal: order.subtotal ?? 0,
      tax: (order as any).ivaTotal ?? 0,
      total: order.totalAmount ?? 0,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      createdAt: (order as any).createdAt,
    };

    // Freeze the BCV rate from the order. The Order writes both
    // totalAmount (USD) and totalAmountVes when it's created, so the
    // ratio gives us the rate that was authoritative at order time.
    // If totalAmountVes is missing (legacy / 0-value orders) we leave
    // exchangeRate undefined — the portal degrades to USD-only display.
    const ves = (order as any).totalAmountVes;
    const exchangeRate =
      typeof ves === "number" &&
      ves > 0 &&
      typeof order.totalAmount === "number" &&
      order.totalAmount > 0
        ? Number((ves / order.totalAmount).toFixed(6))
        : undefined;

    return {
      snapshot,
      amountDue: order.totalAmount ?? 0,
      currency: "USD", // SmartKubik orders price in USD; VES is computed at display
      exchangeRate,
      customerPhone: order.customerPhone,
      allowMethodOverride: (order as any).source !== "storefront",
    };
  }

  private async attemptWhatsappDelivery(
    pr: PaymentRequestDocument,
    rawPhone: string,
  ): Promise<void> {
    pr.delivery.deliveryAttempts = (pr.delivery.deliveryAttempts || 0) + 1;

    let normalized: string;
    try {
      normalized = normalizeWhatsAppPhone(rawPhone);
      if (!normalized || normalized.length < 11) {
        throw new Error("phone_invalid");
      }
    } catch (err) {
      pr.delivery.channel = "pending_manual";
      pr.delivery.lastError = `phone_invalid: ${rawPhone}`;
      pr.events.push({
        at: new Date(),
        actor: "system",
        type: "delivery.skipped",
        payload: { reason: "phone_invalid", attempted: rawPhone },
      });
      return;
    }

    try {
      await this.notifications.sendPortalLinkViaWhatsApp(
        pr,
        normalized,
        this.buildPortalUrl(pr.token),
      );
      pr.delivery.channel = "whatsapp";
      pr.delivery.deliveredTo = normalized;
      pr.delivery.deliveredAt = new Date();
      pr.delivery.lastError = undefined;
      pr.events.push({
        at: new Date(),
        actor: "system",
        type: "delivery.sent",
        payload: { channel: "whatsapp", to: normalized },
      });
    } catch (err) {
      pr.delivery.channel = "pending_manual";
      pr.delivery.lastError = err?.message || "whatsapp_failed";
      pr.events.push({
        at: new Date(),
        actor: "system",
        type: "delivery.failed",
        payload: { error: pr.delivery.lastError },
      });
    }
  }

  /**
   * Construct the portal URL for a token. Public so controllers can attach
   * it as a derived field on response payloads — the admin frontend
   * doesn't know STOREFRONT_PUBLIC_URL, so the backend has to surface
   * the URL whenever it returns a PaymentRequest.
   */
  buildPortalUrl(token: string): string {
    const base = process.env.STOREFRONT_PUBLIC_URL || "http://localhost:3001";
    const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${trimmed}/pago/${token}`;
  }

  /**
   * Convenience for controllers: take a PR document (or any object with a
   * `token` field), produce a plain object with `portalUrl` attached.
   */
  attachPortalUrl<T extends { token?: string; toObject?: () => any }>(
    pr: T,
  ): any {
    if (!pr) return pr;
    const plain = typeof pr.toObject === "function" ? pr.toObject() : { ...pr };
    if (plain?.token) {
      plain.portalUrl = this.buildPortalUrl(plain.token);
    }
    return plain;
  }
}
