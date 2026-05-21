import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduTuitionFee, EduTuitionFeeDocument } from "../../../schemas/edu-tuition-fee.schema";

interface PaymentConfirmedPayload {
  paymentId: string;
  tenantId: string;
  paymentType?: string;
  metadata?: {
    tuitionFeeId?: string;
    [key: string]: any;
  };
}

@Injectable()
export class TuitionPaymentListener {
  private readonly logger = new Logger(TuitionPaymentListener.name);

  constructor(
    @InjectModel(EduTuitionFee.name) private tuitionModel: Model<EduTuitionFeeDocument>,
  ) {}

  // Escucha el evento que payments.service deberá emitir cuando un pago se confirme
  @OnEvent("payment.confirmed")
  async handlePaymentConfirmed(payload: PaymentConfirmedPayload) {
    if (payload.paymentType !== "tuition") return;
    if (!payload.metadata?.tuitionFeeId) return;

    try {
      const result = await this.tuitionModel.updateOne(
        {
          _id: new Types.ObjectId(payload.metadata.tuitionFeeId),
          tenantId: new Types.ObjectId(payload.tenantId),
          isDeleted: { $ne: true },
        },
        {
          $set: {
            status: "paid",
            paymentId: new Types.ObjectId(payload.paymentId),
          },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(
          `Cuota ${payload.metadata.tuitionFeeId} marcada como pagada vía payment.confirmed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error procesando payment.confirmed para cuota ${payload.metadata.tuitionFeeId}: ${error.message}`,
      );
    }
  }
}
