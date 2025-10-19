import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards, Logger, Inject, forwardRef } from "@nestjs/common";
import { MessageDocument } from "./schemas/message.schema";
import { ChatService } from "./chat.service";

// @UseGuards(JwtAuthGuard) // We will uncomment this later
@WebSocketGateway({
  cors: {
    origin: "*", // Adjust for production
  },
  namespace: "chat",
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  handleConnection(client: Socket, ...args: any[]) {
    const tenantId = client.handshake.query.tenantId as string;
    if (tenantId) {
      this.logger.log(
        `Client ${client.id} connected and joined room for tenant ${tenantId}`,
      );
      client.join(tenantId);
    } else {
      this.logger.warn(`Client ${client.id} connected without a tenantId.`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // We could also implement logic to make the client leave the room
  }

  emitNewMessage(tenantId: string, message: MessageDocument) {
    this.logger.log(`Emitting newMessage to room ${tenantId}`);
    this.server.to(tenantId).emit("newMessage", message);
  }

  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: { conversationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log("sendMessage event received from client:", data);
    const tenantId = Array.from(client.rooms).find(
      (room) => room !== client.id,
    );

    if (tenantId) {
      // Later, we'll get the userId from the authenticated socket
      // const userId = client.handshake.query.userId as string;
      await this.chatService.sendOutgoingMessage(data, tenantId);
    } else {
      this.logger.error(
        `Could not find tenantId for client ${client.id}. Message not sent.`,
      );
      client.emit(
        "error",
        "Authentication error: Missing tenantId. Cannot send message.",
      );
    }
  }
}
