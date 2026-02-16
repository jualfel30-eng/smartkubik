import {
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "data-import",
})
export class DataImportGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DataImportGateway.name);

  handleConnection(@ConnectedSocket() client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    const userId = client.handshake.query.userId as string;

    if (userId) {
      client.join(`import:${userId}`);
      this.logger.log(`Client ${client.id} joined import room: import:${userId}`);
    }

    if (tenantId) {
      client.join(`import-tenant:${tenantId}`);
    }

    if (!tenantId && !userId) {
      this.logger.warn(`Client ${client.id} connected to data-import without tenantId or userId`);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected from data-import: ${client.id}`);
  }

  /** Emit progress update to the user who initiated the import */
  emitProgress(userId: string, payload: any) {
    if (!this.server) return;
    this.server.to(`import:${userId}`).emit("import:progress", payload);
  }

  /** Emit completion event */
  emitComplete(userId: string, payload: any) {
    if (!this.server) return;
    this.server.to(`import:${userId}`).emit("import:complete", payload);
  }

  /** Emit failure event */
  emitFailed(userId: string, payload: any) {
    if (!this.server) return;
    this.server.to(`import:${userId}`).emit("import:failed", payload);
  }
}
