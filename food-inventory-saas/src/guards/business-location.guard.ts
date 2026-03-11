import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UserTenantMembership,
  UserTenantMembershipDocument,
} from "../schemas/user-tenant-membership.schema";

/**
 * BusinessLocationGuard
 *
 * Verifies that the user has access to the location specified in the request.
 * Extracts locationId from: body.sourceLocationId, body.destinationLocationId,
 * body.locationId, params.id (for location endpoints), or query.locationId.
 *
 * If the user's membership has an empty allowedLocationIds array,
 * they have access to ALL locations (backwards compatible — admins).
 *
 * Use AFTER JwtAuthGuard + TenantGuard + PermissionsGuard:
 *   @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, BusinessLocationGuard)
 */
@Injectable()
export class BusinessLocationGuard implements CanActivate {
  private readonly logger = new Logger(BusinessLocationGuard.name);

  constructor(
    @InjectModel(UserTenantMembership.name)
    private readonly membershipModel: Model<UserTenantMembershipDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Super admins bypass location check
    if (user.role?.name === "super_admin") return true;

    // Extract location IDs from the request
    const locationIds = this.extractLocationIds(request);

    // If no location ID found in request, allow (endpoint doesn't operate on a specific location)
    if (locationIds.length === 0) return true;

    // Find the user's membership to get allowedLocationIds
    const membership = await this.membershipModel
      .findOne({
        userId: new Types.ObjectId(user.userId || user.id),
        tenantId: new Types.ObjectId(user.tenantId),
        status: "active",
      })
      .lean();

    if (!membership) {
      this.logger.warn(
        `No active membership found for user ${user.email} in tenant ${user.tenantId}`,
      );
      throw new ForbiddenException("Membresía no encontrada.");
    }

    // Empty allowedLocationIds = access to ALL locations (backwards compatible)
    if (
      !membership.allowedLocationIds ||
      membership.allowedLocationIds.length === 0
    ) {
      return true;
    }

    const allowedIds = membership.allowedLocationIds.map((id) =>
      id.toString(),
    );

    // Check that ALL requested location IDs are in the allowed list
    const unauthorized = locationIds.filter(
      (id) => !allowedIds.includes(id),
    );

    if (unauthorized.length > 0) {
      this.logger.warn(
        `User ${user.email} attempted to access unauthorized location(s): ${unauthorized.join(", ")}`,
      );
      throw new ForbiddenException(
        "No tiene acceso a una o más sedes especificadas.",
      );
    }

    return true;
  }

  private extractLocationIds(request: any): string[] {
    const ids = new Set<string>();
    const body = request.body || {};
    const query = request.query || {};

    // From body (transfer orders, etc.)
    if (body.sourceLocationId) ids.add(body.sourceLocationId);
    if (body.destinationLocationId) ids.add(body.destinationLocationId);
    if (body.locationId) ids.add(body.locationId);

    // From query params
    if (query.locationId) ids.add(query.locationId);
    if (query.sourceLocationId) ids.add(query.sourceLocationId);
    if (query.destinationLocationId) ids.add(query.destinationLocationId);

    return Array.from(ids).filter(
      (id) => id && Types.ObjectId.isValid(id),
    );
  }
}
