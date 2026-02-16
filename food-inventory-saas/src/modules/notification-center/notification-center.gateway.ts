import {
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { NotificationDocument } from "../../schemas/notification.schema";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "notifications",
})
export class NotificationCenterGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationCenterGateway.name);

  handleConnection(@ConnectedSocket() client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    const userId = client.handshake.query.userId as string;

    if (tenantId) {
      // Join tenant room for broadcasts
      client.join(`tenant:${tenantId}`);
      this.logger.log(
        `Client ${client.id} joined tenant room: tenant:${tenantId}`,
      );
    }

    if (userId) {
      // Join user-specific room for targeted notifications
      client.join(`user:${userId}`);
      this.logger.log(`Client ${client.id} joined user room: user:${userId}`);
    }

    if (!tenantId && !userId) {
      this.logger.warn(
        `Client ${client.id} connected without tenantId or userId`,
      );
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
  }

  /**
   * Emit notification to a specific user
   */
  emitToUser(userId: string, notification: NotificationDocument) {
    this.logger.log(`Emitting notification to user:${userId}`);
    this.server.to(`user:${userId}`).emit("notification", notification);
  }

  /**
   * Emit notification to all users in a tenant (broadcast)
   */
  emitToTenant(tenantId: string, notification: NotificationDocument) {
    this.logger.log(`Emitting notification to tenant:${tenantId}`);
    this.server.to(`tenant:${tenantId}`).emit("notification", notification);
  }

  /**
   * Emit updated unread count to a specific user
   */
  emitUnreadCount(
    userId: string,
    count: number,
    byCategory: Record<string, number>,
  ) {
    this.logger.log(`Emitting unread count to user:${userId} - count: ${count}`);
    this.server.to(`user:${userId}`).emit("unreadCount", { count, byCategory });
  }

  /**
   * Emit updated unread count to all users in a tenant
   */
  emitUnreadCountToTenant(
    tenantId: string,
    count: number,
    byCategory: Record<string, number>,
  ) {
    this.logger.log(
      `Emitting unread count to tenant:${tenantId} - count: ${count}`,
    );
    this.server
      .to(`tenant:${tenantId}`)
      .emit("unreadCount", { count, byCategory });
  }
}
