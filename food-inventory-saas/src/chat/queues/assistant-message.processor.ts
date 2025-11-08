import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  ASSISTANT_MESSAGES_QUEUE,
  ASSISTANT_PROCESS_MESSAGE_JOB,
} from "./assistant.queue.constants";
import { AssistantMessageJobData } from "./assistant-message.queue.service";
import { ChatService } from "../chat.service";

@Processor(ASSISTANT_MESSAGES_QUEUE)
export class AssistantMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(AssistantMessageProcessor.name);

  constructor(private readonly chatService: ChatService) {
    super();
  }

  async process(job: Job<AssistantMessageJobData>): Promise<void> {
    const data = job.data;
    if (!data) {
      this.logger.warn("Job de asistente recibido sin datos; se omite.");
      return;
    }

    if (job.name && job.name !== ASSISTANT_PROCESS_MESSAGE_JOB) {
      this.logger.debug(
        `Ignoring job ${job.id} with name ${job.name} for assistant queue.`,
      );
      return;
    }

    await this.chatService.processAssistantJob(data);
  }
}
