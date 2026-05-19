import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PaymentRequest,
  PaymentRequestDocument,
  PaymentRequestStatus,
} from "../schemas/payment-request.schema";
import { PaymentTokenService } from "../services/payment-token.service";

/**
 * Public-portal access gate. Loads the PaymentRequest by signed token and
 * refuses access when the request is in a terminal state (confirmed /
 * rejected_final / expired). Re-entry from rejected sub-states (info_mismatch
 * / proof_unclear / partial) is explicitly allowed — that's the whole point
 * of the conversational workflow.
 */
const TERMINAL_STATES: PaymentRequestStatus[] = [
  "confirmed",
  "rejected_final",
  "expired",
];

@Injectable()
export class PaymentTokenGuard implements CanActivate {
  private readonly logger = new Logger(PaymentTokenGuard.name);

  constructor(
    private readonly tokenService: PaymentTokenService,
    @InjectModel(PaymentRequest.name)
    private readonly paymentRequestModel: Model<PaymentRequestDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token: string | undefined = req.params?.token;

    if (!token) {
      throw new UnauthorizedException("Token requerido");
    }

    const claims = this.tokenService.verify(token);

    // Explicit ObjectId cast. The JWT claims arrive as strings; Mongoose
    // autocast for non-_id ObjectId fields is inconsistent under
    // @nestjs/mongoose so we cast manually to follow the project pattern
    // (`docs/wiki/patterns/objectid-vs-string.md`). Skipping this caused
    // every portal request to 401 even with a valid token.
    if (
      !Types.ObjectId.isValid(claims.paymentRequestId) ||
      !Types.ObjectId.isValid(claims.tenantId)
    ) {
      throw new UnauthorizedException("Token con identificadores inválidos");
    }
    const pr = await this.paymentRequestModel.findOne({
      _id: new Types.ObjectId(claims.paymentRequestId),
      tenantId: new Types.ObjectId(claims.tenantId),
      token,
      isDeleted: { $ne: true },
    });

    if (!pr) {
      this.logger.warn(
        `Payment portal access rejected: PR not found for token (id=${claims.paymentRequestId})`,
      );
      throw new UnauthorizedException("Solicitud de pago no encontrada");
    }

    if (TERMINAL_STATES.includes(pr.status)) {
      this.logger.warn(
        `Payment portal access rejected: PR ${pr._id} is in terminal state ${pr.status}`,
      );
      throw new ForbiddenException(
        pr.status === "rejected_final"
          ? "Esta solicitud fue cerrada. Contacta al negocio."
          : pr.status === "confirmed"
            ? "Esta solicitud ya fue confirmada."
            : "Esta solicitud expiró.",
      );
    }

    req.paymentRequest = pr;
    req.paymentTokenClaims = claims;
    return true;
  }
}
