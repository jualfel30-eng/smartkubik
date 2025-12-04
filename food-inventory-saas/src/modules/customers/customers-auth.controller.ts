import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Request,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Injectable,
  CanActivate,
  ExecutionContext,
  Headers,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { OrdersService } from "../orders/orders.service";
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  ChangePasswordDto,
} from "./dto/customer-auth.dto";
import { Public } from "../../decorators/public.decorator";

interface CustomerJwtPayload {
  sub: string; // customer ID
  email: string;
  tenantId: string;
  type: "customer";
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token no proporcionado");
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token);

      // Verify it's a customer token
      if (payload.type !== "customer") {
        throw new UnauthorizedException("Token inválido");
      }

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Token inválido o expirado");
    }
  }
}

@Controller("customers/auth")
export class CustomersAuthController {
  private readonly logger = new Logger(CustomersAuthController.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {}

  @Public()
  @Post("register")
  async register(
    @Body() dto: RegisterCustomerDto,
    @Headers("x-tenant-id") tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException("X-Tenant-ID header is required");
    }
    dto.tenantId = tenantId;

    // Check if email already exists
    const existing = await this.customerModel.findOne({
      email: dto.email.toLowerCase(),
      tenantId,
    });

    if (existing) {
      throw new BadRequestException("El email ya está registrado");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Generate customer number
    const count = await this.customerModel.countDocuments({ tenantId });
    const customerNumber = `C${String(count + 1).padStart(6, "0")}`;

    // Create customer
    const customer = new this.customerModel({
      customerNumber,
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      customerType: "individual",
      hasStorefrontAccount: true,
      emailVerified: false,
      source: "storefront",
      status: "active",
      tenantId,
      createdBy: tenantId, // Using tenantId as createdBy for public registrations
      preferences: {
        preferredCurrency: "USD",
        preferredPaymentMethod: "transfer",
        preferredDeliveryMethod: "delivery",
        communicationChannel: "whatsapp",
        marketingOptIn: dto.marketingOptIn || false,
        invoiceRequired: false,
      },
      metrics: {
        totalOrders: 0,
        totalSpent: 0,
        totalSpentUSD: 0,
        averageOrderValue: 0,
        orderFrequency: 0,
        lifetimeValue: 0,
        returnRate: 0,
        cancellationRate: 0,
        paymentDelayDays: 0,
      },
      tier: "bronze",
    });

    if (dto.phone) {
      customer.contacts = [
        {
          type: "phone",
          value: dto.phone,
          isPrimary: true,
          isActive: true,
        },
      ];
    }

    if (dto.whatsappNumber) {
      customer.whatsappNumber = dto.whatsappNumber;
    }

    const saved = await customer.save();

    // Generate JWT token
    const token = this.generateToken(saved);

    this.logger.log(
      `New customer registered from storefront: ${saved.email} (${saved.customerNumber})`,
    );

    return {
      success: true,
      token,
      customer: {
        id: saved._id,
        customerNumber: saved.customerNumber,
        name: saved.name,
        email: saved.email,
        phone: dto.phone,
        whatsappNumber: dto.whatsappNumber,
        emailVerified: saved.emailVerified,
      },
    };
  }

  @Public()
  @Post("login")
  async login(
    @Body() dto: LoginCustomerDto,
    @Headers("x-tenant-id") tenantId: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException("X-Tenant-ID header is required");
    }
    dto.tenantId = tenantId;

    // Find customer with password
    const customer = await this.customerModel
      .findOne({
        email: dto.email.toLowerCase(),
        tenantId,
        hasStorefrontAccount: true,
      })
      .select("+passwordHash");

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, customer.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    // Update last login
    customer.lastLoginAt = new Date();
    await customer.save();

    // Generate token
    const token = this.generateToken(customer);

    this.logger.log(`Customer logged in: ${customer.email}`);

    return {
      success: true,
      token,
      customer: {
        id: customer._id,
        customerNumber: customer.customerNumber,
        name: customer.name,
        email: customer.email,
        emailVerified: customer.emailVerified,
      },
    };
  }

  @Get("profile")
  @UseGuards(CustomerAuthGuard)
  async getProfile(@Request() req) {
    const customerId = req.user.sub;
    const customer = await this.customerModel.findById(customerId);

    if (!customer) {
      throw new UnauthorizedException("Cliente no encontrado");
    }

    return {
      id: customer._id,
      customerNumber: customer.customerNumber,
      name: customer.name,
      email: customer.email,
      phone: customer.contacts?.find((c) => c.type === "phone")?.value,
      whatsappNumber: customer.whatsappNumber,
      emailVerified: customer.emailVerified,
      addresses: customer.addresses || [],
      preferences: customer.preferences,
      metrics: customer.metrics,
      tier: customer.tier,
      loyaltyPoints: customer.loyaltyPoints,
    };
  }

  @Put("profile")
  @UseGuards(CustomerAuthGuard)
  async updateProfile(@Body() dto: UpdateCustomerProfileDto, @Request() req) {
    const customerId = req.user.sub;
    const customer = await this.customerModel.findById(customerId);

    if (!customer) {
      throw new UnauthorizedException("Cliente no encontrado");
    }

    if (dto.name) {
      customer.name = dto.name;
    }

    if (dto.phone) {
      const phoneContact = customer.contacts?.find((c) => c.type === "phone");
      if (phoneContact) {
        phoneContact.value = dto.phone;
      } else {
        if (!customer.contacts) customer.contacts = [];
        customer.contacts.push({
          type: "phone",
          value: dto.phone,
          isPrimary: true,
          isActive: true,
        });
      }
    }

    if (dto.whatsappNumber !== undefined) {
      customer.whatsappNumber = dto.whatsappNumber;
    }

    if (dto.marketingOptIn !== undefined) {
      if (!customer.preferences) {
        customer.preferences = {} as any;
      }
      customer.preferences.marketingOptIn = dto.marketingOptIn;
    }

    await customer.save();

    return {
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: dto.phone,
        whatsappNumber: customer.whatsappNumber,
      },
    };
  }

  @Post("change-password")
  @UseGuards(CustomerAuthGuard)
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    const customerId = req.user.sub;
    const customer = await this.customerModel
      .findById(customerId)
      .select("+passwordHash");

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException("Cliente no encontrado");
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      dto.currentPassword,
      customer.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException("Contraseña actual incorrecta");
    }

    // Hash new password
    customer.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await customer.save();

    this.logger.log(`Customer changed password: ${customer.email}`);

    return {
      success: true,
      message: "Contraseña actualizada exitosamente",
    };
  }

  @Get("orders")
  @UseGuards(CustomerAuthGuard)
  async getMyOrders(@Request() req) {
    const customerId = req.user.sub;
    const tenantId = req.user.tenantId;

    // Get customer to verify
    const customer = await this.customerModel.findById(customerId);
    if (!customer || !customer.email) {
      throw new UnauthorizedException("Cliente no encontrado");
    }

    // Get orders directly from OrdersService using customerEmail filter
    const orders = await this.ordersService.getCustomerOrders(
      tenantId,
      customer.email,
    );

    return {
      success: true,
      data: orders,
    };
  }

  private generateToken(customer: CustomerDocument): string {
    if (!customer.email) {
      throw new BadRequestException("El cliente no tiene un email registrado");
    }

    const payload: CustomerJwtPayload = {
      sub: customer._id.toString(),
      email: customer.email,
      tenantId: customer.tenantId.toString(),
      type: "customer",
    };

    return this.jwtService.sign(payload);
  }
}
