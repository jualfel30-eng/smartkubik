import { ConflictException } from "@nestjs/common";
import { Types } from "mongoose";
import { PaymentRequestsService } from "../../../src/modules/payment-requests/services/payment-requests.service";
import type {
  PaymentRequestDocument,
  PaymentRequestStatus,
} from "../../../src/modules/payment-requests/schemas/payment-request.schema";

/**
 * State-machine focused tests. We bypass DI by passing minimal mocks to the
 * constructor and exercising only the methods that drive `status` transitions
 * (acceptProof, rejectProof, markAwaitingSettlement, expireStale).
 *
 * The doc itself is a plain object that quacks like a Mongoose document — it
 * has `save()`, `proofs`, `events`, and `status`. That's enough for the
 * state machine.
 */

interface StubProof {
  _id: Types.ObjectId;
  reviewStatus: "pending" | "accepted" | "rejected";
  amount: number;
  currency: "USD" | "VES";
  method: string;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
}

interface StubDoc {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  status: PaymentRequestStatus;
  isDeleted: boolean;
  proofs: StubProof[];
  events: any[];
  paymentIds: Types.ObjectId[];
  expiresAt: Date;
  save: jest.Mock;
}

function makeStubDoc(overrides: Partial<StubDoc> = {}): StubDoc {
  const _id = new Types.ObjectId();
  const doc: StubDoc = {
    _id,
    tenantId: new Types.ObjectId(),
    status: "submitted",
    isDeleted: false,
    proofs: [],
    events: [],
    paymentIds: [],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    save: jest.fn().mockImplementation(function (this: StubDoc) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
  return doc;
}

function makeStubProof(overrides: Partial<StubProof> = {}): StubProof {
  return {
    _id: new Types.ObjectId(),
    reviewStatus: "pending",
    amount: 24.5,
    currency: "USD",
    method: "transfer",
    ...overrides,
  };
}

function buildService(
  paymentRequestFindOne: (tenantId: string, id: string) => StubDoc | null,
): { service: PaymentRequestsService; notifications: any } {
  const paymentRequestModel: any = {
    findOne: jest
      .fn()
      .mockImplementation((q: any) => {
        const doc = paymentRequestFindOne(
          q.tenantId?.toString?.() || q.tenantId,
          q._id?.toString?.() || q._id,
        );
        return Promise.resolve(doc);
      }),
    find: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const notifications = {
    notifyProofSubmitted: jest.fn().mockResolvedValue(undefined),
    notifyConfirmed: jest.fn().mockResolvedValue(undefined),
    notifyStatusChange: jest.fn().mockResolvedValue(undefined),
    notifyInternalStatusChange: jest.fn().mockResolvedValue(undefined),
    sendPortalLinkViaWhatsApp: jest.fn().mockResolvedValue(undefined),
  };

  const service = new PaymentRequestsService(
    paymentRequestModel as any,
    {} as any, // orderModel
    {} as any, // tenantPaymentConfigModel
    {} as any, // tenantModel
    {} as any, // tokenService
    {} as any, // imageOptimizer
    {} as any, // storage
    notifications as any,
    {} as any, // paymentsService
  );

  return { service, notifications };
}

describe("PaymentRequestsService — state machine", () => {
  // ────────────────────────────────────────────────────────────────────
  // markAwaitingSettlement
  // ────────────────────────────────────────────────────────────────────

  describe("markAwaitingSettlement", () => {
    it("submitted → awaiting_settlement is legal", async () => {
      const doc = makeStubDoc({ status: "submitted" });
      const { service } = buildService(() => doc as any);

      await service.markAwaitingSettlement(
        doc.tenantId.toString(),
        doc._id.toString(),
        { kind: "tenant", userId: new Types.ObjectId().toString() },
      );

      expect(doc.status).toBe("awaiting_settlement");
      expect(doc.save).toHaveBeenCalled();
      expect(doc.events.at(-1).type).toBe("awaiting_settlement");
    });

    it("pending → awaiting_settlement is illegal (only tenants from submitted)", async () => {
      const doc = makeStubDoc({ status: "pending" });
      const { service } = buildService(() => doc as any);

      await expect(
        service.markAwaitingSettlement(
          doc.tenantId.toString(),
          doc._id.toString(),
          { kind: "tenant", userId: new Types.ObjectId().toString() },
        ),
      ).rejects.toThrow(ConflictException);
      expect(doc.status).toBe("pending");
    });

    it("confirmed → awaiting_settlement is illegal (terminal state)", async () => {
      const doc = makeStubDoc({ status: "confirmed" });
      const { service } = buildService(() => doc as any);

      await expect(
        service.markAwaitingSettlement(
          doc.tenantId.toString(),
          doc._id.toString(),
          { kind: "tenant", userId: new Types.ObjectId().toString() },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // acceptProof / rejectProof
  // ────────────────────────────────────────────────────────────────────

  describe("acceptProof", () => {
    it("marks proof accepted and is idempotent on a second call", async () => {
      const proof = makeStubProof({ reviewStatus: "pending" });
      const doc = makeStubDoc({ status: "submitted", proofs: [proof] });
      const { service } = buildService(() => doc as any);

      await service.acceptProof(
        doc.tenantId.toString(),
        doc._id.toString(),
        proof._id.toString(),
        { note: "looks good" },
        { kind: "tenant", userId: new Types.ObjectId().toString() },
      );

      expect(proof.reviewStatus).toBe("accepted");
      expect(proof.reviewNote).toBe("looks good");
      expect(doc.status).toBe("submitted"); // accepting one proof doesn't change status

      // Second call: should be a no-op (no new event appended)
      const eventsBefore = doc.events.length;
      await service.acceptProof(
        doc.tenantId.toString(),
        doc._id.toString(),
        proof._id.toString(),
        {},
        { kind: "tenant", userId: new Types.ObjectId().toString() },
      );
      expect(doc.events.length).toBe(eventsBefore);
    });
  });

  describe("rejectProof", () => {
    it("info_mismatch transitions submitted → info_mismatch and notifies customer", async () => {
      const proof = makeStubProof();
      const doc = makeStubDoc({ status: "submitted", proofs: [proof] });
      const { service, notifications } = buildService(() => doc as any);

      await service.rejectProof(
        doc.tenantId.toString(),
        doc._id.toString(),
        proof._id.toString(),
        { reason: "info_mismatch", note: "cédula no coincide" },
        { kind: "tenant", userId: new Types.ObjectId().toString() },
      );

      expect(doc.status).toBe("info_mismatch");
      expect(proof.reviewStatus).toBe("rejected");
      expect(notifications.notifyStatusChange).toHaveBeenCalledTimes(1);
      expect(notifications.notifyInternalStatusChange).not.toHaveBeenCalled();
    });

    it("rejected_final transitions submitted → rejected_final", async () => {
      const proof = makeStubProof();
      const doc = makeStubDoc({ status: "submitted", proofs: [proof] });
      const { service } = buildService(() => doc as any);

      await service.rejectProof(
        doc.tenantId.toString(),
        doc._id.toString(),
        proof._id.toString(),
        { reason: "rejected_final" },
        { kind: "tenant", userId: new Types.ObjectId().toString() },
      );

      expect(doc.status).toBe("rejected_final");
    });

    it("awaiting_settlement uses the silent (internal) notification only", async () => {
      const proof = makeStubProof();
      const doc = makeStubDoc({ status: "submitted", proofs: [proof] });
      const { service, notifications } = buildService(() => doc as any);

      await service.rejectProof(
        doc.tenantId.toString(),
        doc._id.toString(),
        proof._id.toString(),
        { reason: "awaiting_settlement" },
        { kind: "tenant", userId: new Types.ObjectId().toString() },
      );

      expect(doc.status).toBe("awaiting_settlement");
      expect(notifications.notifyStatusChange).not.toHaveBeenCalled();
      expect(notifications.notifyInternalStatusChange).toHaveBeenCalledTimes(1);
    });

    it("rejecting from confirmed is illegal", async () => {
      const proof = makeStubProof();
      const doc = makeStubDoc({ status: "confirmed", proofs: [proof] });
      const { service } = buildService(() => doc as any);

      await expect(
        service.rejectProof(
          doc.tenantId.toString(),
          doc._id.toString(),
          proof._id.toString(),
          { reason: "info_mismatch" },
          { kind: "tenant", userId: new Types.ObjectId().toString() },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // confirm
  // ────────────────────────────────────────────────────────────────────

  describe("confirm", () => {
    it("requires at least one accepted proof", async () => {
      const proof = makeStubProof({ reviewStatus: "pending" });
      const doc = makeStubDoc({ status: "submitted", proofs: [proof] });
      const { service } = buildService(() => doc as any);

      await expect(
        service.confirm(doc.tenantId.toString(), doc._id.toString(), {
          kind: "tenant",
          userId: new Types.ObjectId().toString(),
        }),
      ).rejects.toThrow(/Acepta al menos un comprobante/);
    });

    it("requires an authenticated user", async () => {
      const doc = makeStubDoc({ status: "submitted" });
      const { service } = buildService(() => doc as any);

      await expect(
        service.confirm(doc.tenantId.toString(), doc._id.toString(), {
          kind: "tenant", // no userId
        }),
      ).rejects.toThrow(/usuario autenticado/);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // expireStale (cron entry point)
  // ────────────────────────────────────────────────────────────────────

  describe("expireStale", () => {
    it("transitions every found pending PR to expired and counts the result", async () => {
      const pr1 = makeStubDoc({
        status: "pending",
        expiresAt: new Date(Date.now() - 86400000),
      });
      const pr2 = makeStubDoc({
        status: "pending",
        expiresAt: new Date(Date.now() - 2 * 86400000),
      });

      const paymentRequestModel: any = {
        find: jest.fn().mockResolvedValue([pr1, pr2]),
        findOne: jest.fn(),
        countDocuments: jest.fn(),
      };

      const service = new PaymentRequestsService(
        paymentRequestModel,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {
          notifyProofSubmitted: jest.fn(),
          notifyConfirmed: jest.fn(),
          notifyStatusChange: jest.fn(),
          notifyInternalStatusChange: jest.fn(),
          sendPortalLinkViaWhatsApp: jest.fn(),
        } as any,
        {} as any,
      );

      const count = await service.expireStale();

      expect(count).toBe(2);
      expect(pr1.status).toBe("expired");
      expect(pr2.status).toBe("expired");
      expect(pr1.events.at(-1).type).toBe("expired");
      expect(pr1.events.at(-1).actor).toBe("system");
    });

    it("never throws if one PR transition fails — keeps processing the rest", async () => {
      const okay = makeStubDoc({
        status: "pending",
        expiresAt: new Date(Date.now() - 86400000),
      });
      const broken = makeStubDoc({
        status: "pending",
        expiresAt: new Date(Date.now() - 86400000),
      });
      broken.save = jest.fn().mockRejectedValue(new Error("db down"));

      const paymentRequestModel: any = {
        find: jest.fn().mockResolvedValue([broken, okay]),
        findOne: jest.fn(),
        countDocuments: jest.fn(),
      };

      const service = new PaymentRequestsService(
        paymentRequestModel,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {
          notifyProofSubmitted: jest.fn(),
          notifyConfirmed: jest.fn(),
          notifyStatusChange: jest.fn(),
          notifyInternalStatusChange: jest.fn(),
          sendPortalLinkViaWhatsApp: jest.fn(),
        } as any,
        {} as any,
      );

      const count = await service.expireStale();
      expect(count).toBe(1); // only okay succeeded
      expect(okay.status).toBe("expired");
    });
  });
});
