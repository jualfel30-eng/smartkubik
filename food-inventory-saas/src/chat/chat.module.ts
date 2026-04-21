import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { ChatController } from "./chat.controller";
import {
  Conversation,
  ConversationSchema,
} from "./schemas/conversation.schema";
import { Message, MessageSchema } from "./schemas/message.schema";
import {
  PendingAction,
  PendingActionSchema,
} from "./schemas/pending-action.schema";
import { WhapiSignatureGuard } from "./guards/whapi-signature.guard";

import { SuperAdminModule } from "../modules/super-admin/super-admin.module";
import { AssistantModule } from "../modules/assistant/assistant.module";
import { WhapiModule } from "../modules/whapi/whapi.module";
import { AssistantMessageQueueService } from "./queues/assistant-message.queue.service";
import { AssistantMessageProcessor } from "./queues/assistant-message.processor";
import { ASSISTANT_MESSAGES_QUEUE } from "./queues/assistant.queue.constants";
import { UsersModule } from "../modules/users/users.module";
import {
  UserTenantMembership,
  UserTenantMembershipSchema,
} from "../schemas/user-tenant-membership.schema";
import { Role, RoleSchema } from "../schemas/role.schema";

const queueImports =
  process.env.DISABLE_BULLMQ === "true"
    ? []
    : [
      BullModule.registerQueue({
        name: ASSISTANT_MESSAGES_QUEUE,
        configKey: 'secondary',
      }),
    ];

const queueProviders =
  process.env.DISABLE_BULLMQ === "true"
    ? [
      {
        provide: getQueueToken(ASSISTANT_MESSAGES_QUEUE),
        useValue: null,
      },
      AssistantMessageQueueService,
    ]
    : [AssistantMessageQueueService, AssistantMessageProcessor];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: PendingAction.name, schema: PendingActionSchema },
      { name: UserTenantMembership.name, schema: UserTenantMembershipSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    ...queueImports,
    SuperAdminModule,
    AssistantModule,
    WhapiModule,
    UsersModule,
  ],
  providers: [ChatService, ChatGateway, WhapiSignatureGuard, ...queueProviders],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule { }
