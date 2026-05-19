import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { AddMarketingPermissionsMigration } from "./add-marketing-permissions.migration";
import { PopulateTransactionHistoryMigration } from "./populate-transaction-history.migration";
import { RebuildProductAffinityMigration } from "./rebuild-product-affinity.migration";
import { SeedDefaultWarehousesMigration } from "./seed-default-warehouses.migration";
import { LinkPaymentsToOrdersMigration } from "./link-payments-to-orders.migration";
import { AddCountryCodeMigration } from "./add-country-code.migration";
import { SeedDefaultBusinessLocationsMigration } from "./seed-default-business-locations.migration";
import { FixVariantSkusMigration } from "./fix-variant-skus.migration";
import { ExtendTenantPaymentConfigForPaymentRequestsMigration } from "./extend-tenant-payment-config-for-payment-requests.migration";
import { SeedPaymentRequestsReviewPermissionMigration } from "./seed-payment-requests-review-permission.migration";
import { SeedEducationPermissionsMigration } from "./seed-education-permissions.migration";
import { SeedTeacherRoleMigration } from "./seed-teacher-role.migration";

@ApiTags("Migrations")
@Controller("migrations")
@UseGuards(JwtAuthGuard)
export class MigrationsController {
  constructor(
    private readonly addMarketingPermissionsMigration: AddMarketingPermissionsMigration,
    private readonly populateTransactionHistoryMigration: PopulateTransactionHistoryMigration,
    private readonly rebuildProductAffinityMigration: RebuildProductAffinityMigration,
    private readonly seedDefaultWarehousesMigration: SeedDefaultWarehousesMigration,
    private readonly linkPaymentsToOrdersMigration: LinkPaymentsToOrdersMigration,
    private readonly addCountryCodeMigration: AddCountryCodeMigration,
    private readonly seedDefaultBusinessLocationsMigration: SeedDefaultBusinessLocationsMigration,
    private readonly fixVariantSkusMigration: FixVariantSkusMigration,
    private readonly extendTenantPaymentConfigForPaymentRequestsMigration: ExtendTenantPaymentConfigForPaymentRequestsMigration,
    private readonly seedPaymentRequestsReviewPermissionMigration: SeedPaymentRequestsReviewPermissionMigration,
    private readonly seedEducationPermissionsMigration: SeedEducationPermissionsMigration,
    private readonly seedTeacherRoleMigration: SeedTeacherRoleMigration,
  ) {}

  @Post("add-marketing-permissions")
  @ApiOperation({
    summary: "[SUPER ADMIN] Add marketing permissions to database",
    description:
      "Adds marketing_read and marketing_write permissions to the permissions collection",
  })
  @ApiResponse({
    status: 200,
    description: "Permissions added successfully",
  })
  async addMarketingPermissions() {
    await this.addMarketingPermissionsMigration.run();
    return {
      success: true,
      message: "Marketing permissions migration completed successfully",
    };
  }

  @Post("populate-transaction-history")
  @ApiOperation({
    summary: "[SUPER ADMIN] Populate transaction history from existing orders",
    description:
      "Creates transaction history records for all completed orders that have a customer",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction history populated successfully",
  })
  async populateTransactionHistory() {
    await this.populateTransactionHistoryMigration.run();
    return {
      success: true,
      message: "Transaction history migration completed successfully",
    };
  }

  @Post("rebuild-product-affinity")
  @ApiOperation({
    summary: "[SUPER ADMIN] Rebuild product affinity matrix from transactions",
    description:
      "Rebuilds the product-customer matrix from all existing transaction history records. This creates ProductAffinity records tracking customer purchase patterns and product co-purchase data.",
  })
  @ApiResponse({
    status: 200,
    description: "Product affinity matrix rebuilt successfully",
  })
  async rebuildProductAffinity() {
    await this.rebuildProductAffinityMigration.run();
    return {
      success: true,
      message: "Product affinity matrix rebuild completed successfully",
    };
  }

  @Post("seed-default-warehouses")
  @ApiOperation({
    summary: "[SUPER ADMIN] Seed default warehouses and backfill inventories",
    description:
      "Creates warehouse 'GEN' per tenant if missing and assigns it to inventories without warehouseId.",
  })
  @ApiResponse({
    status: 200,
    description: "Default warehouses seeded successfully",
  })
  async seedDefaultWarehouses() {
    await this.seedDefaultWarehousesMigration.run();
    return {
      success: true,
      message: "Default warehouses seeded successfully",
    };
  }

  @Post("link-payments-to-orders")
  @ApiOperation({
    summary: "[SUPER ADMIN] Link payments to orders after database restore",
    description:
      "Rebuilds payment-order relationships by processing payment allocations and updating order.payments arrays, paidAmount, and paymentStatus fields.",
  })
  @ApiResponse({
    status: 200,
    description: "Payments linked to orders successfully",
  })
  async linkPaymentsToOrders() {
    await this.linkPaymentsToOrdersMigration.run();
    return {
      success: true,
      message: "Payments linked to orders migration completed successfully",
    };
  }

  @Post("add-country-code")
  @ApiOperation({
    summary: "[SUPER ADMIN] Add countryCode field to all tenants",
    description:
      "Sets countryCode='VE' on all existing tenants that don't have the field yet. Part of internationalization Phase 0.",
  })
  @ApiResponse({
    status: 200,
    description: "Country code added to tenants successfully",
  })
  async addCountryCode() {
    const result = await this.addCountryCodeMigration.run();
    return {
      success: true,
      message: `Country code migration completed: ${result.updated} tenants updated`,
    };
  }

  @Post("seed-default-business-locations")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Seed default business locations and link warehouses",
    description:
      "Creates a default BusinessLocation 'Sede Principal' (SEDE-001) per tenant that has warehouses, and links existing warehouses to it. Idempotent — safe to run multiple times.",
  })
  @ApiResponse({
    status: 200,
    description: "Default business locations seeded successfully",
  })
  async seedDefaultBusinessLocations() {
    const result = await this.seedDefaultBusinessLocationsMigration.run();
    return {
      success: true,
      message: `Business locations migration completed: ${result.created} created, ${result.skipped} skipped, ${result.total} tenants processed`,
    };
  }

  @Post("fix-variant-skus")
  @ApiOperation({
    summary: "[SUPER ADMIN] Fix variant SKUs that were incorrectly generated as -VAR1",
    description:
      "Fixes primary variant SKUs that were generated as '{baseSku}-VAR1' instead of using the base product SKU directly. Also updates corresponding inventory records.",
  })
  @ApiResponse({
    status: 200,
    description: "Variant SKUs fixed successfully",
  })
  async fixVariantSkus() {
    const result = await this.fixVariantSkusMigration.run();
    return {
      success: true,
      message: `Variant SKU migration completed: ${result.productsFixed} products fixed, ${result.inventoriesFixed} inventory records updated`,
    };
  }

  @Post("extend-tenant-payment-config-for-payment-requests")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Backfill TenantPaymentConfig with PaymentRequest settings",
    description:
      "Adds requirePaymentProof=false, allowPartialPayments=false, paymentRequestExpiryDays=7 to existing TenantPaymentConfig documents that lack them. Idempotent.",
  })
  @ApiResponse({
    status: 200,
    description: "TenantPaymentConfig backfill completed",
  })
  async extendTenantPaymentConfigForPaymentRequests() {
    const result =
      await this.extendTenantPaymentConfigForPaymentRequestsMigration.run();
    return {
      success: true,
      message: `TenantPaymentConfig extension completed: requirePaymentProof ${result.updatedRequirePaymentProof}, allowPartialPayments ${result.updatedAllowPartialPayments}, expiryDays ${result.updatedExpiryDays}`,
    };
  }

  @Post("seed-payment-requests-review-permission")
  @ApiOperation({
    summary:
      "[SUPER ADMIN] Seed payment_requests_review permission and grant to admin/employee roles",
    description:
      "Inserts payment_requests_review into the permissions collection if missing and grants it to existing admin and employee role documents. Idempotent.",
  })
  @ApiResponse({
    status: 200,
    description: "payment_requests_review permission seeded",
  })
  async seedPaymentRequestsReviewPermission() {
    const result =
      await this.seedPaymentRequestsReviewPermissionMigration.run();
    return {
      success: true,
      message: `payment_requests_review permission seeded (inserted: ${result.permissionInserted}, roles updated: ${result.rolesUpdated})`,
    };
  }

  @Post("seed-education-permissions")
  @ApiOperation({
    summary: "[SUPER ADMIN] Seed education vertical permissions and grant to admin roles",
    description:
      "Inserts the 16 edu_* permissions into the permissions collection if missing and grants them to existing admin role documents. Idempotent.",
  })
  @ApiResponse({
    status: 200,
    description: "Education permissions seeded",
  })
  async seedEducationPermissions() {
    const result = await this.seedEducationPermissionsMigration.run();
    return {
      success: true,
      message: `Education permissions seeded (inserted: ${result.permissionsInserted}, existed: ${result.alreadyExisted}, roles updated: ${result.rolesUpdated})`,
    };
  }

  @Post("seed-teacher-role")
  @ApiOperation({
    summary: "[SUPER ADMIN] Create TEACHER role for all EDUCATION tenants",
    description:
      "Creates a TEACHER role with edu_grades, edu_attendance, edu_schedules, edu_classrooms and edu_students read/write permissions for each tenant with vertical=EDUCATION. Idempotent.",
  })
  @ApiResponse({
    status: 200,
    description: "TEACHER role seeded",
  })
  async seedTeacherRole() {
    const result = await this.seedTeacherRoleMigration.run();
    return {
      success: true,
      message: `TEACHER role migration completed (created: ${result.rolesCreated}, skipped: ${result.rolesSkipped}, tenants: ${result.tenantsProcessed})`,
    };
  }
}
