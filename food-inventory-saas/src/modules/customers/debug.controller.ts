import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";

@Controller("debug")
@UseGuards(JwtAuthGuard)
export class DebugController {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  @Get("compare-suppliers")
  async compareSuppliers(@Request() req) {
    const tenantId = req.user.tenantId;

    // Buscar Geomar
    const geomar = await this.customerModel.findOne({
      customerType: 'supplier',
      tenantId,
      $or: [
        { name: /Geomar/i },
        { companyName: /Geomar/i },
        { 'taxInfo.taxId': /506443430/ }
      ]
    }).lean();

    // Buscar Plasty
    const plasty = await this.customerModel.findOne({
      customerType: 'supplier',
      tenantId,
      $or: [
        { name: /Plasty/i },
        { companyName: /Plasty/i },
        { 'taxInfo.taxId': /296115079/ }
      ]
    }).lean();

    // Buscar TODOS los suppliers
    const allSuppliers = await this.customerModel.find({
      customerType: 'supplier',
      tenantId
    }).lean();

    const differences = {};
    if (geomar && plasty) {
      const fields = ['_id', 'name', 'companyName', 'customerType', 'status', 'tenantId', 'customerNumber', 'taxInfo'];
      fields.forEach(field => {
        const gVal = JSON.stringify(geomar[field]);
        const pVal = JSON.stringify(plasty[field]);
        if (gVal !== pVal) {
          differences[field] = {
            geomar: geomar[field],
            plasty: plasty[field],
            geomarType: typeof geomar[field],
            plastyType: typeof plasty[field]
          };
        }
      });
    }

    return {
      success: true,
      data: {
        geomar: geomar || null,
        plasty: plasty || null,
        totalSuppliers: allSuppliers.length,
        geomarFound: !!geomar,
        plastyFound: !!plasty,
        differences,
        geomarInList: allSuppliers.some(s =>
          s.name?.includes('Geomar') ||
          s.companyName?.includes('Geomar') ||
          s.taxInfo?.taxId?.includes('506443430')
        )
      }
    };
  }
}
