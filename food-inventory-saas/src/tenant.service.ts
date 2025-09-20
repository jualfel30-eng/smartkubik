import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { Tenant, TenantDocument } from "./schemas/tenant.schema";
import { User, UserDocument } from "./schemas/user.schema";
import { Customer, CustomerDocument } from "./schemas/customer.schema"; // Importar Customer
import {
  UpdateTenantSettingsDto,
  InviteUserDto,
  UpdateUserDto,
} from "./dto/tenant.dto";

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>, // Inyectar CustomerModel
  ) {}

  async uploadLogo(
    tenantId: string,
    file: Express.Multer.File,
  ): Promise<Tenant> {
    if (!file) {
      throw new BadRequestException("No se ha proporcionado ningún archivo.");
    }

    // Validar tipo de archivo (opcional, pero recomendado)
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        "Tipo de archivo no soportado. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP).",
      );
    }

    // Convertir el buffer del archivo a Base64
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(
        tenantId,
        { $set: { logo: base64Image } },
        { new: true, runValidators: true },
      )
      .select("name contactInfo taxInfo logo website timezone settings")
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException("Tenant no encontrado al subir el logo.");
    }

    return updatedTenant;
  }

  async getSettings(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select("name contactInfo taxInfo logo website timezone settings")
      .exec();

    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado");
    }
    return tenant;
  }

  async updateSettings(
    tenantId: string,
    updateDto: UpdateTenantSettingsDto,
  ): Promise<Tenant> {
    // We flatten the DTO to update nested objects correctly with $set
    const updatePayload = {};
    if (updateDto.name) updatePayload["name"] = updateDto.name;
    if (updateDto.logo) updatePayload["logo"] = updateDto.logo;
    if (updateDto.website) updatePayload["website"] = updateDto.website;
    if (updateDto.timezone) updatePayload["timezone"] = updateDto.timezone;

    if (updateDto.contactInfo) {
      const contactInfo = updateDto.contactInfo;
      Object.keys(contactInfo).forEach((key) => {
        updatePayload[`contactInfo.${key}`] = contactInfo[key];
      });
    }

    if (updateDto.taxInfo) {
      const taxInfo = updateDto.taxInfo;
      Object.keys(taxInfo).forEach((key) => {
        updatePayload[`taxInfo.${key}`] = taxInfo[key];
      });
    }

    if (updateDto.settings) {
      const { currency, inventory, documentTemplates } = updateDto.settings;
      if (currency) {
        Object.keys(currency).forEach((key) => {
          updatePayload[`settings.currency.${key}`] = currency[key];
        });
      }
      if (inventory) {
        Object.keys(inventory).forEach((key) => {
          updatePayload[`settings.inventory.${key}`] = inventory[key];
        });
      }
      if (documentTemplates) {
        const { invoice, quote } = documentTemplates;
        if (invoice) {
          Object.keys(invoice).forEach((key) => {
            updatePayload[`settings.documentTemplates.invoice.${key}`] = invoice[key];
          });
        }
        if (quote) {
          Object.keys(quote).forEach((key) => {
            updatePayload[`settings.documentTemplates.quote.${key}`] = quote[key];
          });
        }
      }
    }

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(
        tenantId,
        { $set: updatePayload },
        { new: true, runValidators: true },
      )
      .select("name contactInfo taxInfo logo website timezone settings")
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException(
        "Tenant no encontrado al intentar actualizar",
      );
    }

    return updatedTenant;
  }

  async getUsers(tenantId: string): Promise<User[]> {
    return this.userModel.find({ tenantId }).populate('role').select("-password").exec();
  }

  async inviteUser(
    tenantId: string,
    inviteUserDto: InviteUserDto,
  ): Promise<Partial<User>> {
    const existingUser = await this.userModel
      .findOne({
        email: inviteUserDto.email,
        tenantId,
      })
      .exec();

    if (existingUser) {
      throw new ConflictException(
        "Un usuario con este email ya existe en este tenant",
      );
    }

    // Generar una contraseña temporal aleatoria
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newUser = new this.userModel({
      ...inviteUserDto,
      tenantId,
      password: hashedPassword,
      isEmailVerified: false, // El usuario deberá verificar su email
      // TODO: Enviar email de invitación con la contraseña temporal
    });

    const savedUser = await newUser.save();

    // Crear el registro de Customer correspondiente
    const customerNumber = `EMP-${Date.now()}`;
    const newCustomer = new this.customerModel({
      customerNumber,
      name: savedUser.firstName,
      lastName: savedUser.lastName,
      customerType: 'employee', // ¡Clave!
      contacts: [{
        type: 'email',
        value: savedUser.email,
        isPrimary: true,
      }],
      tenantId: savedUser.tenantId,
      createdBy: savedUser._id, // Auto-referencia o el admin que lo crea
      status: 'active',
    });
    await newCustomer.save();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = savedUser.toObject();
    return result;
  }

  async updateUser(
    tenantId: string,
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: userId, tenantId },
        { $set: updateUserDto },
        { new: true },
      )
      .select("-password")
      .exec();

    if (!user) {
      throw new NotFoundException("Usuario no encontrado en este tenant");
    }

    return user;
  }

  async deleteUser(tenantId: string, userId: string, requestingUserId: string) {
    if (userId === requestingUserId) {
      throw new BadRequestException("No puedes eliminarte a ti mismo");
    }

    const result = await this.userModel
      .deleteOne({ _id: userId, tenantId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Usuario no encontrado en este tenant");
    }

    // Adicionalmente, desactivar el registro de Customer correspondiente
    await this.customerModel.findOneAndUpdate(
      { createdBy: userId, tenantId }, // Asumiendo que `createdBy` linkea al usuario
      { $set: { status: 'inactive' } }
    ).exec();

    return { success: true, message: "Usuario eliminado exitosamente" };
  }
}
