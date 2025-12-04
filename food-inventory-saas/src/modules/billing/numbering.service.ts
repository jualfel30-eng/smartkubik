import { Injectable, Logger } from "@nestjs/common";
import {
  DocumentSequence,
  DocumentSequenceDocument,
} from "../../schemas/document-sequence.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import {
  SequenceLock,
  SequenceLockDocument,
} from "../../schemas/sequence-lock.schema";
import { randomUUID } from "crypto";
import { RedisLockService } from "./redis-lock.service";

@Injectable()
export class NumberingService {
  private readonly logger = new Logger(NumberingService.name);
  private readonly lockTtlMs = 2000;
  private readonly maxLockAttempts = 5;
  private readonly retryDelayMs = 100;

  constructor(
    @InjectModel(DocumentSequence.name)
    private sequenceModel: Model<DocumentSequenceDocument>,
    @InjectModel(SequenceLock.name)
    private lockModel: Model<SequenceLockDocument>,
    private readonly redisLockService: RedisLockService,
  ) {}

  /**
   * Obtiene el próximo número de documento de forma transaccional.
   * Usa transacción (session) si está disponible; fallback a findOneAndUpdate atómico.
   */
  async getNextNumber(
    sequence: DocumentSequenceDocument,
    tenantId: string,
  ): Promise<string> {
    const rangeEnd = sequence.rangeEnd ?? Number.MAX_SAFE_INTEGER;
    const owner = randomUUID();
    let locked = false;
    let lockId: string | null = null;
    let lockOwner: string = owner;

    // Primero intentar redis (si disponible)
    if (this.redisLockService.hasClient()) {
      const redisKey = `billing:seq:${tenantId}:${sequence._id.toString()}`;
      const res = await this.redisLockService.acquireLock(
        redisKey,
        this.lockTtlMs,
        this.maxLockAttempts,
        this.retryDelayMs,
      );
      if (res.ok && res.owner) {
        locked = true;
        lockOwner = res.owner;
        lockId = `redis:${redisKey}`;
      }
    }

    // Fallback a lock Mongo si no se logró con redis
    if (!locked) {
      for (
        let attempt = 1;
        attempt <= this.maxLockAttempts && !locked;
        attempt++
      ) {
        const now = new Date();
        const lock = await this.lockModel.findOneAndUpdate(
          {
            tenantId,
            sequenceId: sequence._id,
            $or: [
              { lockedUntil: { $lt: now } },
              { lockedUntil: { $exists: false } },
            ],
          },
          {
            tenantId,
            sequenceId: sequence._id,
            owner,
            lockedUntil: new Date(now.getTime() + this.lockTtlMs),
            expireAt: new Date(now.getTime() + this.lockTtlMs * 2),
          },
          { upsert: true, new: true },
        );
        if (lock && lock.owner === owner) {
          locked = true;
          lockId = lock._id.toString();
          lockOwner = owner;
          break;
        }
        await new Promise((res) => setTimeout(res, this.retryDelayMs));
      }
    }

    if (!locked) {
      throw new Error("No se pudo adquirir lock de numeración");
    }
    let updated: DocumentSequenceDocument | null = null;
    const session = await this.sequenceModel.db
      .startSession()
      .catch(() => null);

    if (session) {
      try {
        await session.withTransaction(async () => {
          updated = await this.sequenceModel.findOneAndUpdate(
            {
              _id: sequence._id,
              tenantId,
              status: "active",
              currentNumber: { $lt: rangeEnd },
            },
            { $inc: { currentNumber: 1 } },
            { new: true, session },
          );
          if (!updated) {
            throw new Error("No se pudo incrementar la secuencia (tx)");
          }
        });
      } catch (err) {
        this.logger.error("Error en transacción de numeración", err.stack);
      } finally {
        await session.endSession();
      }
    }

    if (!updated) {
      updated = await this.sequenceModel.findOneAndUpdate(
        {
          _id: sequence._id,
          tenantId,
          status: "active",
          currentNumber: { $lt: rangeEnd },
        },
        { $inc: { currentNumber: 1 } },
        { new: true },
      );
    }

    if (!updated) {
      throw new Error("No se pudo incrementar la secuencia");
    }
    // Liberar lock si fue tomado por este owner
    if (lockId?.startsWith("redis:")) {
      const key = lockId.replace("redis:", "");
      await this.redisLockService.releaseLock(key, lockOwner);
    } else if (lockId) {
      await this.lockModel.deleteOne({ _id: lockId, owner, tenantId });
    }
    const prefix = updated.prefix || "";
    return `${prefix}${updated.currentNumber}`;
  }
}
