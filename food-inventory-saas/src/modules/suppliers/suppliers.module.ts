import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SuppliersController } from "./suppliers.controller";
import { SuppliersService } from "./suppliers.service";
import { Supplier, SupplierSchema } from "../../schemas/supplier.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema"; // Import Customer
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
      { name: Customer.name, schema: CustomerSchema }, // Add Customer
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService], // Export to be used by other modules like Purchases
})
export class SuppliersModule {}
