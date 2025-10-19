import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { AssistantService } from "./assistant.service";

interface AskAssistantPayload {
  tenantId?: string;
  question: string;
  topK?: number;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "assistant",
})
export class AssistantGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AssistantGateway.name);

  constructor(private readonly assistantService: AssistantService) {}

  handleConnection(client: Socket) {
    const tenantId =
      (client.handshake.query?.tenantId as string) || "smartkubik_docs";
    this.logger.log(
      `Assistant client connected: ${client.id}, tenantId=${tenantId}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Assistant client disconnected: ${client.id}`);
  }

  @SubscribeMessage("askAssistant")
  async handleQuestion(
    @MessageBody() payload: AskAssistantPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const tenantId =
      payload.tenantId ||
      (client.handshake.query?.tenantId as string) ||
      "smartkubik_docs";
    const question = payload.question;
    const topK = payload.topK ?? 5;

    try {
      const response = await this.assistantService.answerQuestion({
        tenantId,
        question,
        topK,
        knowledgeBaseTenantId: tenantId,
      });
      client.emit("assistantResponse", {
        tenantId,
        question,
        ...response,
      });
    } catch (error) {
      const message =
        (error as Error)?.message ||
        "No se pudo procesar la solicitud al asistente.";
      this.logger.error(
        `Assistant error for tenant ${tenantId}: ${message}`,
        (error as Error)?.stack,
      );
      client.emit("assistantError", {
        tenantId,
        question,
        message,
      });
    }
  }
}
