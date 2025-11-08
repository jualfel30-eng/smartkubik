import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, Optional } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  ASSISTANT_MESSAGES_QUEUE,
  ASSISTANT_PROCESS_MESSAGE_JOB,
} from "./assistant.queue.constants";

export interface AssistantMessageJobData {
  tenantId: string;
  conversationId: string;
  customerPhoneNumber: string;
  messageId: string;
  content: string;
}

@Injectable()
export class AssistantMessageQueueService {
  private readonly logger = new Logger(AssistantMessageQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(ASSISTANT_MESSAGES_QUEUE)
    private readonly assistantQueue: Queue<AssistantMessageJobData> | null,
  ) {}

  /**
   * Encola el procesamiento de un mensaje del asistente.
   * Si BullMQ está desactivado, retorna false para que el caller procese inline.
   */
  async enqueueAssistantMessage(
    data: AssistantMessageJobData,
  ): Promise<boolean> {
    if (!this.assistantQueue) {
      this.logger.debug(
        "BullMQ deshabilitado; el procesamiento del asistente se hará inline.",
      );
      return false;
    }

    await this.assistantQueue.add(ASSISTANT_PROCESS_MESSAGE_JOB, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    this.logger.debug(
      `Mensaje del asistente encolado (tenant ${data.tenantId}, conversation ${data.conversationId})`,
    );
    return true;
  }
}
