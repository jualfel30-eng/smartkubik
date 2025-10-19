import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { ChatController } from "./chat.controller";
import {
  Conversation,
  ConversationSchema,
} from "./schemas/conversation.schema";
import { Message, MessageSchema } from "./schemas/message.schema";
import { WhapiSignatureGuard } from "./guards/whapi-signature.guard";

import { SuperAdminModule } from "../modules/super-admin/super-admin.module";
import { AssistantModule } from "../modules/assistant/assistant.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    SuperAdminModule,
    AssistantModule,
  ],
  providers: [ChatService, ChatGateway, WhapiSignatureGuard],
  controllers: [ChatController],
})
export class ChatModule {}
