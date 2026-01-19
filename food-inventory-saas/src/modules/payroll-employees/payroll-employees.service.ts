import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { FilterQuery, Model, Types } from "mongoose";
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from "../../schemas/employee-profile.schema";
import {
  EmployeeContract,
  EmployeeContractDocument,
} from "../../schemas/employee-contract.schema";
import {
  PayrollStructure,
  PayrollStructureDocument,
} from "../../schemas/payroll-structure.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { CreateEmployeeProfileDto } from "./dto/create-employee-profile.dto";
import { UpdateEmployeeProfileDto } from "./dto/update-employee-profile.dto";
import { CreateEmployeeContractDto } from "./dto/create-employee-contract.dto";
import { UpdateEmployeeContractDto } from "./dto/update-employee-contract.dto";
import { EmployeeFiltersDto } from "./dto/employee-filters.dto";
import { PaginationDto } from "../../dto/pagination.dto";
import { BatchNotifyEmployeesDto } from "./dto/batch-notify-employees.dto";
import { BulkUpdateEmployeeStatusDto } from "./dto/bulk-update-employee-status.dto";
import { BulkAssignPayrollStructureDto } from "./dto/bulk-assign-structure.dto";
import { NotificationsService } from "../notifications/notifications.service";
const PDFDocument = require("pdfkit");

@Injectable()
export class PayrollEmployeesService {
  private readonly logger = new Logger(PayrollEmployeesService.name);

  constructor(
    @InjectModel(EmployeeProfile.name)
    private readonly profileModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeContract.name)
    private readonly contractModel: Model<EmployeeContractDocument>,
    @InjectModel(PayrollStructure.name)
    private readonly structureModel: Model<PayrollStructureDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    return new Types.ObjectId(id);
  }

  async createProfile(
    dto: CreateEmployeeProfileDto,
    tenantId: string,
    userId: string,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const customer = await this.customerModel
      .findOne({
        _id: dto.customerId,
        tenantId: tenantObjectId,
      })
      .exec();

    if (!customer) {
      throw new NotFoundException(
        "El contacto seleccionado no existe o no pertenece a este tenant",
      );
    }

    const existingProfile = await this.profileModel
      .findOne({
        tenantId: tenantObjectId,
        customerId: customer._id,
      })
      .exec();

    if (existingProfile) {
      throw new BadRequestException(
        "Ya existe un perfil de empleado para este contacto",
      );
    }

    if (customer.customerType !== "employee") {
      customer.customerType = "employee";
      await customer.save();
    }

    const profilePayload: Partial<EmployeeProfile> = {
      tenantId: tenantObjectId,
      customerId: customer._id,
      userId: dto.userId ? this.toObjectId(dto.userId) : undefined,
      employeeNumber: dto.employeeNumber,
      position: dto.position,
      department: dto.department,
      tags: dto.tags,
      supervisorId: dto.supervisorId,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      probationEndDate: dto.probationEndDate
        ? new Date(dto.probationEndDate)
        : undefined,
      terminationDate: dto.terminationDate
        ? new Date(dto.terminationDate)
        : undefined,
      status: dto.status || "active",
      emergencyContact: dto.emergencyContact,
      documents: dto.documents,
      workLocation: dto.workLocation,
      notes: dto.notes,
      customFields: dto.customFields,
    };

    const profile = new this.profileModel(profilePayload);
    const savedProfile = await profile.save();

    let createdContract: EmployeeContractDocument | null = null;
    if (dto.contract) {
      createdContract = await this.createContractInternal(
        savedProfile._id,
        tenantObjectId,
        dto.contract,
        userId,
      );
      savedProfile.currentContractId = createdContract._id;
      await savedProfile.save();
    }

    // Emit event for notification center
    this.eventEmitter.emit("employee.created", {
      employeeId: savedProfile._id.toString(),
      employeeName: customer.name || customer.companyName,
      position: dto.position,
      department: dto.department,
      tenantId,
    });

    return this.mapProfile(savedProfile, createdContract, customer);
  }

  async findAll(
    tenantId: string,
    filters: EmployeeFiltersDto,
  ): Promise<{
    data: any[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const tenantObjectId = this.toObjectId(tenantId);
    const {
      page = 1,
      limit = 20,
      status,
      department,
      search,
      structureId,
    } = filters;
    const filter: FilterQuery<EmployeeProfileDocument> = {
      tenantId: tenantObjectId,
    };

    if (status && status !== "all") {
      filter.status = status;
    }
    if (department) {
      filter.department = department;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      const matchingCustomers = await this.customerModel
        .find({
          tenantId: tenantObjectId,
          $or: [{ name: regex }, { companyName: regex }],
        })
        .select("_id")
        .limit(50)
        .lean();
      filter.customerId = { $in: matchingCustomers.map((c) => c._id) };
    }

    if (structureId && structureId !== "all") {
      const structureFilter: Record<string, any> = {
        tenantId: tenantObjectId,
      };
      if (structureId === "none") {
        structureFilter.$or = [
          { payrollStructureId: { $exists: false } },
          { payrollStructureId: null },
        ];
      } else {
        structureFilter.payrollStructureId = this.toObjectId(structureId);
      }
      const structureContracts = await this.contractModel
        .find(structureFilter)
        .select("_id")
        .lean();
      if (!structureContracts.length) {
        return {
          data: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
        };
      }
      filter.currentContractId = {
        $in: structureContracts.map((contract) => contract._id),
      };
    }

    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "customerId",
          "name companyName email phone customerType contacts addresses taxInfo primaryLocation",
        )
        .populate({
          path: "currentContractId",
          populate: {
            path: "payrollStructureId",
            select:
              "name version isActive appliesToRoles appliesToDepartments appliesToContractTypes",
          },
        })
        .lean(),
      this.profileModel.countDocuments(filter),
    ]);

    return {
      data: profiles.map((profile) =>
        this.mapProfile(
          profile as any,
          profile.currentContractId as any,
          profile.customerId as any,
        ),
      ),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string) {
    const tenantObjectId = this.toObjectId(tenantId);
    const profile = await this.profileModel
      .findOne({
        _id: id,
        tenantId: tenantObjectId,
      })
      .populate(
        "customerId",
        "name companyName email phone customerType contacts addresses taxInfo primaryLocation",
      )
      .populate({
        path: "currentContractId",
        populate: {
          path: "payrollStructureId",
          select:
            "name version isActive appliesToRoles appliesToDepartments appliesToContractTypes",
        },
      })
      .exec();

    if (!profile) {
      throw new NotFoundException("Empleado no encontrado");
    }

    return this.mapProfile(
      profile,
      profile.currentContractId,
      profile.customerId,
    );
  }

  async updateProfile(
    id: string,
    tenantId: string,
    dto: UpdateEmployeeProfileDto,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const profile = await this.profileModel
      .findOne({ _id: id, tenantId: tenantObjectId })
      .exec();

    if (!profile) {
      throw new NotFoundException("Empleado no encontrado");
    }

    Object.assign(profile, {
      employeeNumber: dto.employeeNumber ?? profile.employeeNumber,
      position: dto.position ?? profile.position,
      department: dto.department ?? profile.department,
      tags: dto.tags ?? profile.tags,
      supervisorId: dto.supervisorId ?? profile.supervisorId,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : profile.hireDate,
      probationEndDate: dto.probationEndDate
        ? new Date(dto.probationEndDate)
        : profile.probationEndDate,
      terminationDate: dto.terminationDate
        ? new Date(dto.terminationDate)
        : profile.terminationDate,
      status: dto.status ?? profile.status,
      emergencyContact: dto.emergencyContact ?? profile.emergencyContact,
      documents: dto.documents ?? profile.documents,
      workLocation: dto.workLocation ?? profile.workLocation,
      notes: dto.notes ?? profile.notes,
      customFields: dto.customFields ?? profile.customFields,
    });

    if (dto.userId) {
      profile.userId = this.toObjectId(dto.userId);
    }

    await profile.save();

    await profile.populate(
      "customerId",
      "name companyName email phone customerType contacts addresses taxInfo primaryLocation",
    );
    await profile.populate({
      path: "currentContractId",
      populate: {
        path: "payrollStructureId",
        select:
          "name version isActive appliesToRoles appliesToDepartments appliesToContractTypes",
      },
    });

    return this.mapProfile(
      profile,
      profile.currentContractId as any,
      profile.customerId as any,
    );
  }

  async createContract(
    employeeId: string,
    tenantId: string,
    dto: CreateEmployeeContractDto,
    userId: string,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const profile = await this.profileModel
      .findOne({ _id: employeeId, tenantId: tenantObjectId })
      .exec();

    if (!profile) {
      throw new NotFoundException("Empleado no encontrado");
    }

    const contract = await this.createContractInternal(
      profile._id,
      tenantObjectId,
      dto,
      userId,
    );

    profile.currentContractId = contract._id;
    await profile.save();

    return contract;
  }

  async listContracts(
    employeeId: string,
    tenantId: string,
    pagination: PaginationDto,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<EmployeeContractDocument> = {
      tenantId: tenantObjectId,
      employeeId: this.toObjectId(employeeId),
    };

    const [contracts, total] = await Promise.all([
      this.contractModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.contractModel.countDocuments(filter),
    ]);

    return {
      data: contracts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateContract(
    employeeId: string,
    contractId: string,
    tenantId: string,
    dto: UpdateEmployeeContractDto,
    userId: string,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const contract = await this.contractModel
      .findOne({
        _id: contractId,
        employeeId: this.toObjectId(employeeId),
        tenantId: tenantObjectId,
      })
      .exec();

    if (!contract) {
      throw new NotFoundException("Contrato no encontrado");
    }

    Object.assign(contract, {
      contractType: dto.contractType ?? contract.contractType,
      startDate: dto.startDate ? new Date(dto.startDate) : contract.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : contract.endDate,
      payFrequency: dto.payFrequency ?? contract.payFrequency,
      payDay: dto.payDay ?? contract.payDay,
      nextPayDate: dto.nextPayDate
        ? new Date(dto.nextPayDate)
        : contract.nextPayDate,
      compensationType: dto.compensationType ?? contract.compensationType,
      compensationAmount: dto.compensationAmount ?? contract.compensationAmount,
      currency: dto.currency ?? contract.currency,
      payrollStructureId:
        dto.payrollStructureId !== undefined
          ? dto.payrollStructureId
            ? this.toObjectId(dto.payrollStructureId)
            : undefined
          : contract.payrollStructureId,
      schedule: dto.schedule ?? contract.schedule,
      benefits: dto.benefits ?? contract.benefits,
      deductions: dto.deductions ?? contract.deductions,
      bankAccount: dto.bankAccount ?? contract.bankAccount,
      taxation: dto.taxation ?? contract.taxation,
      status: dto.status ?? contract.status,
      notes: dto.notes ?? contract.notes,
    });

    contract.history = contract.history || [];
    contract.history.push({
      action: "updated",
      userId: userId ? this.toObjectId(userId) : undefined,
      notes: dto.notes,
      at: new Date(),
    });

    await contract.save();
    return contract;
  }

  private async createContractInternal(
    employeeId: Types.ObjectId,
    tenantId: Types.ObjectId,
    dto: CreateEmployeeContractDto,
    userId: string,
  ) {
    const contract = new this.contractModel({
      tenantId,
      employeeId,
      contractType: dto.contractType,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      payFrequency: dto.payFrequency,
      payDay: dto.payDay,
      nextPayDate: dto.nextPayDate ? new Date(dto.nextPayDate) : undefined,
      compensationType: dto.compensationType,
      compensationAmount: dto.compensationAmount,
      currency: dto.currency || "USD",
      payrollStructureId: dto.payrollStructureId
        ? this.toObjectId(dto.payrollStructureId)
        : undefined,
      schedule: dto.schedule,
      benefits: dto.benefits,
      deductions: dto.deductions,
      bankAccount: dto.bankAccount,
      taxation: dto.taxation,
      status: dto.status || "active",
      notes: dto.notes,
      history: [
        {
          action: "created",
          userId: userId ? this.toObjectId(userId) : undefined,
          at: new Date(),
        },
      ],
    });

    return contract.save();
  }

  private mapProfile(
    profile: EmployeeProfile | EmployeeProfileDocument | Record<string, any>,
    contract?:
      | EmployeeContract
      | EmployeeContractDocument
      | Record<string, any>
      | null,
    customer?: Customer | CustomerDocument | Record<string, any> | null,
  ) {
    const plainProfile = (profile as any)?.toObject
      ? (profile as any).toObject()
      : profile;
    const plainContract =
      contract && (contract as any)?.toObject
        ? (contract as any).toObject()
        : contract;
    const plainCustomer =
      customer && (customer as any)?.toObject
        ? (customer as any).toObject()
        : customer;

    const contactsArray =
      plainCustomer && Array.isArray((plainCustomer as any).contacts)
        ? (plainCustomer as any).contacts
        : [];

    const primaryEmail =
      contactsArray?.find(
        (contact) => contact.type === "email" || contact.name === "email",
      )?.value || (plainCustomer as any)?.email;

    const primaryPhone = contactsArray?.find(
      (contact) => contact.type === "phone" || contact.name === "phone",
    )?.value;

    const primaryAddress =
      plainCustomer && Array.isArray((plainCustomer as any).addresses)
        ? (plainCustomer as any).addresses.find(
            (address) => address?.isDefault,
          ) || (plainCustomer as any).addresses[0]
        : undefined;

    return {
      ...plainProfile,
      customer: plainCustomer
        ? {
            id: (plainCustomer as any)._id,
            name: (plainCustomer as any).name,
            companyName: (plainCustomer as any).companyName,
            email: primaryEmail,
            phone: primaryPhone,
            customerType: (plainCustomer as any).customerType,
            taxInfo: (plainCustomer as any).taxInfo,
            address: primaryAddress,
          }
        : undefined,
      currentContract: plainContract || undefined,
    };
  }

  async ensureProfileForCustomer(
    customerId: string,
    tenantId: string,
    options?: {
      userId?: string;
      status?: string;
      hireDate?: string | Date;
      contract?: CreateEmployeeContractDto;
    },
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const customerObjectId = this.toObjectId(customerId);

    const customer = await this.customerModel
      .findOne({ _id: customerObjectId, tenantId: tenantObjectId })
      .exec();

    if (!customer) {
      throw new NotFoundException("Contacto no encontrado para crear empleado");
    }

    if (customer.customerType !== "employee") {
      customer.customerType = "employee";
      await customer.save();
    }

    let profile = await this.profileModel
      .findOne({ tenantId: tenantObjectId, customerId: customer._id })
      .exec();

    if (profile) {
      if (options?.userId) {
        profile.userId = this.toObjectId(options.userId);
        await profile.save();
      }
      return profile;
    }

    profile = new this.profileModel({
      tenantId: tenantObjectId,
      customerId: customer._id,
      userId: options?.userId ? this.toObjectId(options.userId) : undefined,
      status: options?.status || "active",
      hireDate: options?.hireDate ? new Date(options.hireDate) : undefined,
    });

    await profile.save();

    if (options?.contract) {
      const contract = await this.createContractInternal(
        profile._id,
        tenantObjectId,
        options.contract,
        options.userId || "",
      );
      profile.currentContractId = contract._id;
      await profile.save();
    }

    return profile;
  }

  async generateDocument(
    tenantId: string,
    employeeId: string,
    type: string = "employment_letter",
    language: string = "es",
    options?: {
      orgName?: string;
      orgAddress?: string;
      signerName?: string;
      signerTitle?: string;
    },
  ) {
    const employee = await this.findOne(employeeId, tenantId);
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    const titleMap: Record<string, { es: string; en: string }> = {
      employment_letter: { es: "Carta de Trabajo", en: "Employment Letter" },
      income_certificate: {
        es: "Constancia de Ingresos",
        en: "Income Certificate",
      },
      seniority_letter: {
        es: "Constancia de Antigüedad",
        en: "Seniority Letter",
      },
      fiscal_certificate: { es: "Constancia Fiscal", en: "Tax Certificate" },
    };
    const title =
      titleMap[type]?.[language === "en" ? "en" : "es"] ||
      titleMap.employment_letter[language === "en" ? "en" : "es"];

    const today = new Date();
    const formatDate = (date: Date) =>
      date.toLocaleDateString(language === "en" ? "en-US" : "es-VE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const contract = employee.currentContract || {};
    const name = employee.customer?.name || "Empleado";
    const position =
      employee.position || contract.position || "Cargo no asignado";
    const department =
      employee.department || contract.department || "Departamento";
    const startDate = contract.startDate
      ? formatDate(new Date(contract.startDate))
      : "Sin fecha";
    const compensation =
      contract.compensationAmount && contract.currency
        ? `${contract.compensationAmount} ${contract.currency}`
        : "No registrado";
    const company =
      options?.orgName ||
      employee.customer?.companyName ||
      employee.customer?.name ||
      (language === "en" ? "The Company" : "La empresa");
    const companyAddress =
      options?.orgAddress ||
      employee.customer?.address ||
      (language === "en" ? "Company address" : "Dirección de la empresa");
    const signer =
      options?.signerName ||
      (language === "en" ? "HR / Payroll" : "RRHH / Nómina");
    const signerTitle =
      options?.signerTitle ||
      (language === "en" ? "Authorized Signatory" : "Firmante autorizado");

    const tenureYears = contract.startDate
      ? Math.max(
          0,
          Math.floor(
            (today.getTime() - new Date(contract.startDate).getTime()) /
              (1000 * 60 * 60 * 24 * 365),
          ),
        )
      : 0;

    return await new Promise((resolve) => {
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: "application/pdf",
          filename: `${type}-${employeeId}.pdf`,
        });
      });

      doc.fontSize(16).text(company, { align: "left" });
      doc
        .fontSize(10)
        .fillColor("#555")
        .text(companyAddress, { align: "left" });
      doc.moveDown();
      doc.fillColor("#000").fontSize(18).text(title, { align: "center" });
      doc.moveDown();
      doc.fontSize(11).text(formatDate(today), { align: "right" });
      doc.moveDown();

      doc.fontSize(12);
      if (type === "income_certificate") {
        doc.text(
          language === "en"
            ? `This is to certify that ${name} is employed by ${company} in the position of ${position} within the ${department} department since ${startDate}. The current compensation is ${compensation}.`
            : `Por medio de la presente se certifica que ${name} labora en ${company} en la posición de ${position} dentro del departamento de ${department} desde el ${startDate}. Su compensación actual es ${compensation}.`,
          { align: "justify" },
        );
      } else if (type === "seniority_letter") {
        doc.text(
          language === "en"
            ? `${name} has been employed by ${company} since ${startDate}, currently holding the position of ${position} in the ${department} department. Tenure: ${tenureYears} years. Current compensation: ${compensation}.`
            : `${name} labora en ${company} desde el ${startDate}, ocupando el cargo de ${position} en el departamento de ${department}. Antigüedad: ${tenureYears} años. Compensación actual: ${compensation}.`,
          { align: "justify" },
        );
      } else if (type === "fiscal_certificate") {
        doc.text(
          language === "en"
            ? `For fiscal purposes, it is certified that ${name} is employed by ${company} as ${position} in ${department}, with start date ${startDate}. Current compensation: ${compensation}.`
            : `A efectos fiscales, se certifica que ${name} labora en ${company} como ${position} en ${department}, con fecha de ingreso ${startDate}. Compensación actual: ${compensation}.`,
          { align: "justify" },
        );
      } else {
        doc.text(
          language === "en"
            ? `This letter is to confirm that ${name} holds the position of ${position} in the ${department} department at ${company}. Employment start date: ${startDate}. Current compensation: ${compensation}.`
            : `Por medio de la presente se hace constar que ${name} ocupa el cargo de ${position} en el departamento de ${department} de ${company}. Fecha de ingreso: ${startDate}. Compensación actual: ${compensation}.`,
          { align: "justify" },
        );
      }

      doc.moveDown();
      doc
        .fontSize(12)
        .text(
          language === "en"
            ? "This document is issued at the request of the interested party."
            : "Constancia emitida a petición de la parte interesada.",
          { align: "justify" },
        );

      doc.moveDown(2);
      doc.text(language === "en" ? "Sincerely," : "Atentamente,");
      doc.moveDown(4);
      doc.text("____________________________");
      doc.text(signer);
      doc.text(signerTitle);
      doc.end();
    });
  }

  async getSummary(tenantId: string) {
    const tenantObjectId = this.toObjectId(tenantId);

    const statusAggPromise = this.profileModel.aggregate([
      { $match: { tenantId: tenantObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const departmentAggPromise = this.profileModel.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          department: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ]);

    const totalEmployeesPromise = this.profileModel.countDocuments({
      tenantId: tenantObjectId,
    });

    const activeContractsPromise = this.contractModel.countDocuments({
      tenantId: tenantObjectId,
      status: "active",
    });

    const windowStart = new Date();
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + 30);

    const expiringContractsPromise = this.contractModel.countDocuments({
      tenantId: tenantObjectId,
      status: "active",
      endDate: { $gte: windowStart, $lte: windowEnd },
    });

    const contractStatusAggPromise = this.contractModel.aggregate([
      { $match: { tenantId: tenantObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const contractTypeAggPromise = this.contractModel.aggregate([
      { $match: { tenantId: tenantObjectId } },
      { $group: { _id: "$contractType", count: { $sum: 1 } } },
    ]);

    const expiringContractsListPromise = this.contractModel
      .find({
        tenantId: tenantObjectId,
        status: { $in: ["active", "draft"] },
        endDate: { $gte: windowStart, $lte: windowEnd },
      })
      .sort({ endDate: 1 })
      .limit(10)
      .lean();

    const [
      statusAgg,
      departmentAgg,
      totalEmployees,
      activeContracts,
      expiringContracts,
      contractStatusAgg,
      contractTypeAgg,
      expiringContractsList,
    ] = await Promise.all([
      statusAggPromise,
      departmentAggPromise,
      totalEmployeesPromise,
      activeContractsPromise,
      expiringContractsPromise,
      contractStatusAggPromise,
      contractTypeAggPromise,
      expiringContractsListPromise,
    ]);

    const expiringSoonDetailed = await this.buildContractAlertRows(
      expiringContractsList,
    );

    return {
      totals: {
        employees: totalEmployees,
        activeContracts,
        expiringContracts,
      },
      byStatus: statusAgg.reduce(
        (acc, curr) => ({ ...acc, [curr._id || "unknown"]: curr.count }),
        {},
      ),
      byDepartment: departmentAgg.reduce(
        (acc, curr) => ({ ...acc, [curr._id || "unknown"]: curr.count }),
        {},
      ),
      contractSummary: {
        byStatus: contractStatusAgg.reduce(
          (acc, curr) => ({ ...acc, [curr._id || "unknown"]: curr.count }),
          {},
        ),
        byType: contractTypeAgg.reduce(
          (acc, curr) => ({ ...acc, [curr._id || "unknown"]: curr.count }),
          {},
        ),
        expiringSoon: expiringSoonDetailed,
      },
    };
  }

  async bulkUpdateEmployeeStatus(
    tenantId: string,
    dto: BulkUpdateEmployeeStatusDto,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const employeeIds = dto.employeeIds.map((id) => this.toObjectId(id));

    const result = await this.profileModel.updateMany(
      { tenantId: tenantObjectId, _id: { $in: employeeIds } },
      { status: dto.status },
    );

    return {
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
      status: dto.status,
    };
  }

  async bulkAssignPayrollStructure(
    tenantId: string,
    dto: BulkAssignPayrollStructureDto,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const employeeIds = dto.employeeIds.map((id) => this.toObjectId(id));
    let structureObjectId: Types.ObjectId | null = null;
    if (dto.payrollStructureId) {
      const structure = await this.structureModel
        .findOne({
          _id: this.toObjectId(dto.payrollStructureId),
          tenantId: tenantObjectId,
        })
        .lean();
      if (!structure) {
        throw new NotFoundException("La estructura de nómina no existe");
      }
      structureObjectId = this.toObjectId(dto.payrollStructureId);
    }

    const filter = {
      tenantId: tenantObjectId,
      employeeId: { $in: employeeIds },
      status: { $in: ["active", "draft"] },
    };

    const result = structureObjectId
      ? await this.contractModel.updateMany(filter, {
          $set: { payrollStructureId: structureObjectId },
        })
      : await this.contractModel.updateMany(filter, {
          $unset: { payrollStructureId: "" },
        });

    return {
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
      payrollStructureId: structureObjectId?.toString() || null,
    };
  }

  async sendBatchNotifications(tenantId: string, dto: BatchNotifyEmployeesDto) {
    const tenantObjectId = this.toObjectId(tenantId);
    const employeeIds = dto.employeeIds.map((id) => this.toObjectId(id));
    const profiles = await this.profileModel
      .find({ tenantId: tenantObjectId, _id: { $in: employeeIds } })
      .lean();

    if (profiles.length === 0) {
      throw new NotFoundException(
        "No se encontraron empleados para enviar notificaciones",
      );
    }

    const customerIds = profiles
      .map((profile) => profile.customerId)
      .filter(Boolean);
    const customers = await this.customerModel
      .find({ _id: { $in: customerIds }, tenantId: tenantObjectId })
      .lean();
    const customerMap = new Map(
      customers.map((customer) => [customer._id.toString(), customer]),
    );

    const results = await Promise.allSettled(
      profiles.map(async (profile) => {
        const customer = profile.customerId
          ? customerMap.get(profile.customerId.toString())
          : null;
        if (!customer) {
          throw new NotFoundException(
            `No se encontró el contacto para el empleado ${profile._id}`,
          );
        }

        const mapped = this.mapProfile(profile, null, customer);
        const payloadContext = {
          employeeName: mapped.customer?.name,
          department: profile.department,
          position: profile.position,
          employeeNumber: profile.employeeNumber,
          ...dto.context,
        };

        const notificationResult =
          await this.notificationsService.sendTemplateNotification(
            {
              tenantId,
              customerId: customer._id.toString(),
              templateId: dto.templateId,
              channels: dto.channels,
              customerEmail: mapped.customer?.email,
              customerPhone: mapped.customer?.phone,
              context: payloadContext,
              language: dto.language,
            },
            { engagementDelta: 1 },
          );

        const successfulChannels = notificationResult.filter(
          (item) => item.success,
        );
        if (successfulChannels.length === 0) {
          const errors = notificationResult
            .filter((item) => !item.success)
            .map((item) => item.error)
            .join(", ");
          throw new Error(
            errors || "No se pudo entregar la notificación en ningún canal",
          );
        }

        return {
          employeeId: profile._id.toString(),
          channels: successfulChannels.map((item) => item.channel),
        };
      }),
    );

    const summary = results.reduce(
      (acc, result) => {
        if (result.status === "fulfilled") {
          acc.success += 1;
        } else {
          acc.failed += 1;
          acc.errors.push(result.reason?.message || "Error desconocido");
        }
        return acc;
      },
      { success: 0, failed: 0, errors: [] as string[] },
    );

    return summary;
  }

  async reconcileDuplicateProfiles(tenantId: string) {
    const tenantObjectId = this.toObjectId(tenantId);

    const duplicates = await this.profileModel.aggregate([
      { $match: { tenantId: tenantObjectId } },
      {
        $group: {
          _id: "$customerId",
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length === 0) {
      return {
        processedGroups: 0,
        removedProfiles: 0,
        reassignedContracts: 0,
      };
    }

    let removedProfiles = 0;
    let reassignedContracts = 0;

    for (const group of duplicates) {
      const profiles = await this.profileModel
        .find({ _id: { $in: group.ids } })
        .sort({ createdAt: 1 })
        .exec();
      if (profiles.length <= 1) continue;

      const keeper = profiles[0];
      for (const duplicate of profiles.slice(1)) {
        const result = await this.contractModel.updateMany(
          {
            tenantId: tenantObjectId,
            employeeId: duplicate._id,
          },
          { employeeId: keeper._id },
        );
        reassignedContracts += result.modifiedCount ?? 0;

        if (!keeper.currentContractId && duplicate.currentContractId) {
          keeper.currentContractId = duplicate.currentContractId;
          await keeper.save();
        }

        await this.profileModel.deleteOne({ _id: duplicate._id });
        removedProfiles += 1;
      }

      if (keeper.isModified?.()) {
        await keeper.save();
      }
    }

    return {
      processedGroups: duplicates.length,
      removedProfiles,
      reassignedContracts,
    };
  }

  private async buildContractAlertRows(contracts: Array<Record<string, any>>) {
    if (!contracts?.length) {
      return [];
    }
    const employeeIds = contracts
      .map((contract) => contract.employeeId)
      .filter(Boolean);
    if (employeeIds.length === 0) {
      return contracts;
    }
    const profiles = await this.profileModel
      .find({ _id: { $in: employeeIds } })
      .select(["department", "position", "employeeNumber", "customerId"])
      .lean();
    const customerIds = profiles
      .map((profile) => profile.customerId)
      .filter(Boolean);
    const customers = await this.customerModel
      .find({ _id: { $in: customerIds } })
      .select(["name", "companyName", "contacts"])
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [profile._id.toString(), profile]),
    );
    const customerMap = new Map(
      customers.map((customer) => [customer._id.toString(), customer]),
    );

    return contracts.map((contract) => {
      const profile =
        profileMap.get(contract.employeeId?.toString() || "") || null;
      const customer = profile
        ? customerMap.get(profile.customerId?.toString() || "")
        : null;
      const employeeName =
        (customer as any)?.name ||
        (customer as any)?.companyName ||
        "Empleado sin nombre";
      const endDate = contract.endDate ? new Date(contract.endDate) : null;
      const daysUntilEnd =
        endDate && !Number.isNaN(endDate.getTime())
          ? Math.ceil((endDate.getTime() - Date.now()) / 86400000)
          : null;
      return {
        contractId: contract._id?.toString(),
        employeeId: contract.employeeId?.toString(),
        employeeName,
        department: profile?.department,
        position: profile?.position,
        contractType: contract.contractType,
        endDate: contract.endDate,
        status: contract.status,
        compensationAmount: contract.compensationAmount,
        currency: contract.currency,
        daysUntilEnd,
      };
    });
  }

  async getNextEmployeeNumber(tenantId: string): Promise<string> {
    const tenantObjectId = this.toObjectId(tenantId);
    const lastEmployee = await this.profileModel
      .findOne({
        tenantId: tenantObjectId,
        employeeNumber: /^EMP-/,
      })
      .sort({ employeeNumber: -1 })
      .exec();

    if (!lastEmployee?.employeeNumber) {
      return "EMP-000001";
    }

    const match = lastEmployee.employeeNumber.match(/EMP-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `EMP-${String(nextNumber).padStart(6, "0")}`;
    }

    return "EMP-000001";
  }
}
