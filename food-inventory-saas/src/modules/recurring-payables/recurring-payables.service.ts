import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  RecurringPayable,
  RecurringPayableDocument,
} from "../../schemas/recurring-payable.schema";
import { CreateRecurringPayableDto } from "../../dto/recurring-payable.dto";
import {
  PayablesService,
  CreatePayableDto,
} from "../payables/payables.service";
import { CustomersService } from "../customers/customers.service";
import { CreateCustomerDto } from "../../dto/customer.dto";
import * as moment from "moment-timezone";

@Injectable()
export class RecurringPayablesService {
  private readonly logger = new Logger(RecurringPayablesService.name);

  constructor(
    @InjectModel(RecurringPayable.name)
    private recurringPayableModel: Model<RecurringPayableDocument>,
    private readonly payablesService: PayablesService,
    private readonly customersService: CustomersService,
  ) {}

  async findAll(tenantId: string): Promise<RecurringPayable[]> {
    return this.recurringPayableModel.find({ tenantId }).exec();
  }

  async create(
    dto: CreateRecurringPayableDto,
    tenantId: string,
    userId: string,
  ): Promise<RecurringPayable> {
    const user = { id: userId, tenantId };
    let supplierId = dto.supplierId;
    let payeeName = dto.payeeName;

    if (dto.payeeType === "supplier" && !supplierId) {
      if (
        !dto.newSupplierName ||
        !dto.newSupplierRif ||
        !dto.newSupplierContactName
      ) {
        throw new BadRequestException(
          "Para un nuevo proveedor, se requiere Nombre, RIF y Nombre del Contacto.",
        );
      }
      const newCustomerDto: CreateCustomerDto = {
        name: dto.newSupplierContactName,
        companyName: dto.newSupplierName,
        customerType: "supplier",
        taxInfo: {
          taxId: dto.newSupplierRif,
          taxType: dto.newSupplierRif.charAt(0),
        },
        contacts: [
          {
            type: "phone",
            value: dto.newSupplierContactPhone ?? "",
            isPrimary: true,
          },
        ].filter((c) => c.value),
      };
      const newSupplier = await this.customersService.create(
        newCustomerDto,
        user,
      );
      supplierId = newSupplier._id.toString();
      payeeName = newSupplier.companyName || newSupplier.name;
      this.logger.log(
        `New supplier created from recurring payable: ${payeeName} (${supplierId})`,
      );
    }

    const totalAmount = dto.lines.reduce((sum, line) => sum + line.amount, 0);
    const nextDueDate = moment(dto.startDate).tz("America/Caracas").toDate();

    const newRecurringPayable = new this.recurringPayableModel({
      ...dto,
      payeeId: supplierId,
      payeeName,
      tenantId: user.tenantId,
      createdBy: user.id,
      totalAmount,
      nextDueDate,
      isActive: true,
    });
    return newRecurringPayable.save();
  }

  async generatePayable(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<any> {
    const template = await this.recurringPayableModel
      .findOne({ _id: id, tenantId })
      .exec();
    if (!template || !template.isActive) {
      throw new NotFoundException(
        "Plantilla de pago recurrente no encontrada o inactiva",
      );
    }

    const createPayableDto: CreatePayableDto = {
      type: template.type as any,
      payeeType: template.payeeType as any,
      payeeId: template.payeeId?.toString(),
      payeeName: template.payeeName,
      issueDate: new Date(),
      dueDate: template.nextDueDate,
      description: `${template.templateName} - ${moment(template.nextDueDate).format("MMMM YYYY")}`,
      lines: template.lines.map((l) => ({
        description: l.description,
        amount: l.amount,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        accountId: l.accountId.toString(),
        productId: l.productId?.toString(),
      })),
      notes: template.notes,
    };

    const newPayable = await this.payablesService.create(
      createPayableDto,
      tenantId,
      userId,
    );

    const newNextDueDate = moment(template.nextDueDate)
      .add(1, "month")
      .toDate();
    await this.recurringPayableModel.updateOne(
      { _id: id },
      { nextDueDate: newNextDueDate },
    );

    return newPayable;
  }
}
