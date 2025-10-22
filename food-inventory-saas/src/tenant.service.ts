import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { Tenant, TenantDocument } from "./schemas/tenant.schema";
import { User, UserDocument } from "./schemas/user.schema";
import { Customer, CustomerDocument } from "./schemas/customer.schema"; // Importar Customer
import { MailService } from "./modules/mail/mail.service";
import {
  UpdateTenantSettingsDto,
  InviteUserDto,
  UpdateUserDto,
} from "./dto/tenant.dto";
import { verticalProfileKeys } from "./config/vertical-profiles";

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>, // Inyectar CustomerModel
    private readonly mailService: MailService,
  ) {}

  async uploadLogo(
    tenantId: string,
    file: Express.Multer.File,
  ): Promise<Tenant> {
    if (!file) {
      throw new BadRequestException("No se ha proporcionado ningún archivo.");
    }

    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado");
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    if (tenant.usage.currentStorage + fileSizeInMB > tenant.limits.maxStorage) {
      throw new BadRequestException(
        "Límite de almacenamiento alcanzado para su plan de suscripción.",
      );
    }

    // Validar tipo de archivo (opcional, pero recomendado)
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        "Tipo de archivo no soportado. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP).",
      );
    }

    // TODO: Restar el tamaño del logo anterior si existe.
    const oldLogoSizeInMB = 0; // Placeholder

    // Convertir el buffer del archivo a Base64
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(
        tenantId,
        {
          $set: { logo: base64Image },
          $inc: { "usage.currentStorage": fileSizeInMB - oldLogoSizeInMB },
        },
        { new: true, runValidators: true },
      )
      .select(
        "name contactInfo taxInfo logo website timezone settings aiAssistant",
      )
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException("Tenant no encontrado al subir el logo.");
    }

    return updatedTenant;
  }

  async getSettings(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select(
        "name contactInfo taxInfo logo website timezone settings aiAssistant verticalProfile limits usage subscriptionPlan",
      )
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
            updatePayload[`settings.documentTemplates.invoice.${key}`] =
              invoice[key];
          });
        }
        if (quote) {
          Object.keys(quote).forEach((key) => {
            updatePayload[`settings.documentTemplates.quote.${key}`] =
              quote[key];
          });
        }
      }
    }

    if (updateDto.verticalProfile) {
      const { key, overrides } = updateDto.verticalProfile;
      if (!verticalProfileKeys.includes(key)) {
        throw new BadRequestException(
          `Perfil vertical '${key}' no está soportado.`,
        );
      }
      updatePayload["verticalProfile.key"] = key;
      if (overrides !== undefined) {
        updatePayload["verticalProfile.overrides"] = overrides || {};
      }
    }

    if (updateDto.aiAssistant) {
      const { autoReplyEnabled, knowledgeBaseTenantId, model, capabilities } =
        updateDto.aiAssistant;
      if (typeof autoReplyEnabled === "boolean") {
        updatePayload["aiAssistant.autoReplyEnabled"] = autoReplyEnabled;
      }
      if (knowledgeBaseTenantId !== undefined) {
        updatePayload["aiAssistant.knowledgeBaseTenantId"] = (
          knowledgeBaseTenantId || ""
        ).trim();
      }
      if (model !== undefined) {
        updatePayload["aiAssistant.model"] =
          (model || "").trim() || "gpt-4o-mini";
      }
      if (capabilities) {
        const {
          knowledgeBaseEnabled,
          inventoryLookup,
          schedulingLookup,
          orderLookup,
        } = capabilities;
        if (typeof knowledgeBaseEnabled === "boolean") {
          updatePayload["aiAssistant.capabilities.knowledgeBaseEnabled"] =
            knowledgeBaseEnabled;
        }
        if (typeof inventoryLookup === "boolean") {
          updatePayload["aiAssistant.capabilities.inventoryLookup"] =
            inventoryLookup;
        }
        if (typeof schedulingLookup === "boolean") {
          updatePayload["aiAssistant.capabilities.schedulingLookup"] =
            schedulingLookup;
        }
        if (typeof orderLookup === "boolean") {
          updatePayload["aiAssistant.capabilities.orderLookup"] = orderLookup;
        }
      }
    }

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(
        tenantId,
        { $set: updatePayload },
        { new: true, runValidators: true },
      )
      .select(
        "name contactInfo taxInfo logo website timezone settings aiAssistant verticalProfile",
      )
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException(
        "Tenant no encontrado al intentar actualizar",
      );
    }

    return updatedTenant;
  }

  async getUsers(tenantId: string): Promise<User[]> {
    return this.userModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .populate("role")
      .select("-password")
      .exec();
  }

  async inviteUser(
    tenantId: string,
    inviteUserDto: InviteUserDto,
  ): Promise<Partial<User>> {
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado");
    }

    if (tenant.usage.currentUsers >= tenant.limits.maxUsers) {
      throw new ConflictException(
        "Límite de usuarios alcanzado para su plan de suscripción.",
      );
    }

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
      tenantId: new Types.ObjectId(tenantId),
      password: hashedPassword,
      isEmailVerified: false, // El usuario deberá verificar su email
    });

    const savedUser = await newUser.save();

    await this.tenantModel.findByIdAndUpdate(tenantId, {
      $inc: { "usage.currentUsers": 1 },
    });

    // Crear el registro de Customer correspondiente
    const customerNumber = `EMP-${Date.now()}`;
    const newCustomer = new this.customerModel({
      customerNumber,
      name: savedUser.firstName,
      lastName: savedUser.lastName,
      customerType: "employee", // ¡Clave!
      contacts: [
        {
          type: "email",
          value: savedUser.email,
          isPrimary: true,
        },
      ],
      tenantId: savedUser.tenantId,
      createdBy: savedUser._id, // Auto-referencia o el admin que lo crea
      status: "active",
    });
    await newCustomer.save();

    // Enviar el correo de bienvenida
    try {
      await this.mailService.sendUserWelcomeEmail(
        savedUser.email,
        temporaryPassword,
      );
    } catch (error) {
      // Si el email falla, no queremos que la creación del usuario falle.
      // Simplemente lo logueamos. En un ambiente de producción, usaríamos un logger más robusto.
      console.error(
        `Failed to send welcome email to ${savedUser.email}`,
        error,
      );
    }

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

    // Decrement the user count
    await this.tenantModel.findByIdAndUpdate(tenantId, {
      $inc: { "usage.currentUsers": -1 },
    });

    // Adicionalmente, desactivar el registro de Customer correspondiente
    await this.customerModel
      .findOneAndUpdate(
        { createdBy: userId, tenantId }, // Asumiendo que `createdBy` linkea al usuario
        { $set: { status: "inactive" } },
      )
      .exec();

    return { success: true, message: "Usuario eliminado exitosamente" };
  }
}
