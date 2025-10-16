import { Body, Controller, Post, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';
import { InjectModel } from '@nestjs/mongoose';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import { Model } from 'mongoose';

interface AssistantChatRequest {
  question: string;
  topK?: number;
}

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  @Post('chat')
  async chat(@Req() req, @Body() body: AssistantChatRequest) {
    const { question, topK } = body || {};

    if (!question?.trim()) {
      throw new BadRequestException('La pregunta es obligatoria.');
    }

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('No se pudo determinar el tenant del usuario autenticado.');
    }

    const tenant = await this.tenantModel.findById(tenantId).lean();

    const configuredKnowledgeBase = tenant?.aiAssistant?.knowledgeBaseTenantId?.trim();
    const knowledgeBaseTenantId = configuredKnowledgeBase || 'smartkubik_docs';

    const response = await this.assistantService.answerQuestion(
      knowledgeBaseTenantId,
      question,
      topK ?? 5,
    );

    return {
      data: {
        tenantId: knowledgeBaseTenantId,
        ...response,
      },
    };
  }
}
