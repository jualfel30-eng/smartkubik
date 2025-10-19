import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { AssistantService } from "./assistant.service";
import { AssistantToolsService } from "./assistant-tools.service";
import { InjectModel } from "@nestjs/mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { Model } from "mongoose";

interface AssistantChatRequest {
  question: string;
  topK?: number;
}

interface TestInventoryRequest {
  productQuery: string;
  limit?: number;
}

@Controller("assistant")
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly assistantToolsService: AssistantToolsService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  @Post("chat")
  async chat(@Req() req, @Body() body: AssistantChatRequest) {
    const { question, topK } = body || {};

    if (!question?.trim()) {
      throw new BadRequestException("La pregunta es obligatoria.");
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException(
        "No se pudo determinar el tenant del usuario autenticado.",
      );
    }

    const tenant = await this.tenantModel.findById(tenantId).lean();
    const aiAssistantSettings = tenant?.aiAssistant ?? null;

    // Convertir capabilities a objeto plano para evitar problemas con Mongoose
    const capabilities = aiAssistantSettings?.capabilities
      ? JSON.parse(JSON.stringify(aiAssistantSettings.capabilities))
      : undefined;

    const response = await this.assistantService.answerQuestion({
      tenantId,
      question,
      topK: topK ?? 5,
      knowledgeBaseTenantId: aiAssistantSettings?.knowledgeBaseTenantId?.trim(),
      aiSettings: {
        model: aiAssistantSettings?.model,
        capabilities: capabilities,
      },
    });

    return {
      data: {
        tenantId,
        ...response,
      },
    };
  }

  @Post("test-inventory")
  async testInventory(@Req() req, @Body() body: TestInventoryRequest) {
    const { productQuery, limit } = body || {};

    if (!productQuery?.trim()) {
      throw new BadRequestException("El campo productQuery es obligatorio.");
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException(
        "No se pudo determinar el tenant del usuario autenticado.",
      );
    }

    const result = await this.assistantToolsService.executeTool(
      tenantId,
      "get_inventory_status",
      {
        productQuery,
        limit: limit ?? 5,
      },
    );

    return {
      data: {
        tenantId,
        ...result,
      },
    };
  }

  @Get("config")
  async getConfig(@Req() req) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException(
        "No se pudo determinar el tenant del usuario autenticado.",
      );
    }

    const tenant = await this.tenantModel.findById(tenantId).lean();

    return {
      data: {
        tenantId,
        aiAssistant: tenant?.aiAssistant,
      },
    };
  }
}
