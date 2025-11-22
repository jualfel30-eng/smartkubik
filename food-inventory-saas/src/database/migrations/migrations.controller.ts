import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { AddMarketingPermissionsMigration } from "./add-marketing-permissions.migration";
import { PopulateTransactionHistoryMigration } from "./populate-transaction-history.migration";
import { RebuildProductAffinityMigration } from "./rebuild-product-affinity.migration";

@ApiTags("Migrations")
@Controller("migrations")
@UseGuards(JwtAuthGuard)
export class MigrationsController {
  constructor(
    private readonly addMarketingPermissionsMigration: AddMarketingPermissionsMigration,
    private readonly populateTransactionHistoryMigration: PopulateTransactionHistoryMigration,
    private readonly rebuildProductAffinityMigration: RebuildProductAffinityMigration,
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
}
