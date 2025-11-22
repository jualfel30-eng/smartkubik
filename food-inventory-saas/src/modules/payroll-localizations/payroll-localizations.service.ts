import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PayrollLocalization,
  PayrollLocalizationDocument,
} from "../../schemas/payroll-localization.schema";
import { DEFAULT_VE_LOCALIZATION } from "./config/default-localization-ve.config";
import { CreateLocalizationDto } from "./dto/create-localization.dto";
import { AutoImportLocalizationDto } from "./dto/auto-import-localization.dto";

@Injectable()
export class PayrollLocalizationsService {
  private readonly logger = new Logger(PayrollLocalizationsService.name);

  constructor(
    @InjectModel(PayrollLocalization.name)
    private readonly localizationModel: Model<PayrollLocalizationDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId) {
    return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
  }

  async ensureDefaultVE() {
    const exists = await this.localizationModel
      .findOne({ country: "VE", version: 1 })
      .lean();
    if (exists) return exists;
    const created = await this.localizationModel.create({
      ...DEFAULT_VE_LOCALIZATION,
      validFrom: DEFAULT_VE_LOCALIZATION.validFrom,
    });
    return created.toObject();
  }

  async list(tenantId: string) {
    await this.ensureDefaultVE();
    return this.localizationModel
      .find({
        $or: [
          { tenantId: this.toObjectId(tenantId) },
          { tenantId: null },
          { tenantId: { $exists: false } },
        ],
      })
      .sort({ country: 1, version: -1 })
      .lean();
  }

  async create(tenantId: string, dto: CreateLocalizationDto) {
    const payload: any = {
      ...dto,
      tenantId: this.toObjectId(tenantId),
      country: dto.country?.toUpperCase?.() || "VE",
      status: dto.status || "draft",
    };
    if (dto.validFrom) payload.validFrom = new Date(dto.validFrom);
    if (dto.validTo) payload.validTo = new Date(dto.validTo);
    return (await this.localizationModel.create(payload)).toObject();
  }

  private parseCsv(content: string) {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      throw new BadRequestException("CSV vacío");
    }
    const rates: Record<string, number> = {};
    lines.forEach((line, idx) => {
      const [key, value] = line.split(/[,;]/).map((p) => p?.trim());
      if (!key) {
        throw new BadRequestException(`Línea ${idx + 1}: falta clave`);
      }
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new BadRequestException(
          `Línea ${idx + 1}: valor inválido para ${key}`,
        );
      }
      rates[key] = num;
    });
    return { rates };
  }

  private parseJson(content: string) {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed !== "object" || parsed === null) {
        throw new BadRequestException("El JSON debe ser un objeto de tasas");
      }
      return parsed;
    } catch (err) {
      throw new BadRequestException(
        err?.message || "JSON inválido en contenido",
      );
    }
  }

  async autoImport(tenantId: string, dto: AutoImportLocalizationDto) {
    const country = dto.country?.toUpperCase?.() || "VE";
    const parsed =
      dto.format === "csv"
        ? this.parseCsv(dto.content)
        : this.parseJson(dto.content);

    const nowLabel = new Date().toISOString().slice(0, 10);

    const payload: any = {
      country,
      tenantId: this.toObjectId(tenantId),
      label: dto.label || dto.fileName || `Auto-import ${nowLabel}`,
      version: dto.version,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
      rates: parsed?.rates || parsed,
      islrTable: Array.isArray((parsed as any)?.islrTable)
        ? (parsed as any).islrTable
        : undefined,
      status: dto.autoActivate ? "active" : "pending",
      metadata: {
        source: "auto-import",
        fileName: dto.fileName,
        importedAt: new Date(),
        format: dto.format,
        autoApprove: Boolean(dto.autoApprove),
      },
    };

    // Si autoActivate está habilitado, desactivar otras y activar esta nueva
    if (dto.autoActivate) {
      await this.localizationModel.updateMany(
        { tenantId: payload.tenantId, country },
        { $set: { status: "draft" } },
      );
    }

    const created = await this.localizationModel.create(payload);
    return created.toObject();
  }

  async activate(tenantId: string, id: string) {
    const localization = await this.localizationModel.findById(id);
    if (!localization) throw new NotFoundException("Paquete no encontrado");
    const tenantObjectId = this.toObjectId(tenantId);
    // Sólo una versión activa por país/tenant
    await this.localizationModel.updateMany(
      { tenantId: tenantObjectId, country: localization.country },
      { $set: { status: "draft" } },
    );
    localization.status = "active";
    localization.tenantId = tenantObjectId;
    await localization.save();
    return localization.toObject();
  }

  async submitForApproval(tenantId: string, id: string) {
    const tenantObjectId = this.toObjectId(tenantId);
    const localization = await this.localizationModel.findOne({
      _id: this.toObjectId(id),
      tenantId: tenantObjectId,
    });
    if (!localization) {
      throw new NotFoundException("Paquete no encontrado");
    }
    if (localization.status === "active") {
      throw new BadRequestException("Ya está activo");
    }
    localization.status = "pending";
    await localization.save();
    return localization.toObject();
  }

  async approve(tenantId: string, id: string) {
    const tenantObjectId = this.toObjectId(tenantId);
    const localization = await this.localizationModel.findOne({
      _id: this.toObjectId(id),
      tenantId: tenantObjectId,
    });
    if (!localization) {
      throw new NotFoundException("Paquete no encontrado");
    }
    // Desactivar otros
    await this.localizationModel.updateMany(
      { tenantId: tenantObjectId, country: localization.country },
      { $set: { status: "draft" } },
    );
    localization.status = "active";
    await localization.save();
    return localization.toObject();
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async processAutoApprovals() {
    const pending = await this.localizationModel
      .find({
        status: "pending",
        "metadata.autoApprove": true,
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!pending.length) return;

    const processedKeys = new Set<string>();
    for (const loc of pending) {
      const tenantKey = (loc.tenantId || "").toString();
      const countryKey = loc.country || "VE";
      const key = `${tenantKey}-${countryKey}`;
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);
      try {
        await this.localizationModel.updateMany(
          { tenantId: loc.tenantId, country: countryKey },
          { $set: { status: "draft" } },
        );
        await this.localizationModel.updateOne(
          { _id: loc._id },
          {
            $set: {
              status: "active",
              "metadata.autoActivatedAt": new Date(),
            },
          },
        );
        this.logger.log(
          `Auto-aprobado paquete ${loc._id} tenant=${tenantKey} country=${countryKey}`,
        );
      } catch (err) {
        this.logger.error(
          `Error auto-aprobando paquete ${loc._id}: ${err?.message || err}`,
        );
      }
    }
  }
}
