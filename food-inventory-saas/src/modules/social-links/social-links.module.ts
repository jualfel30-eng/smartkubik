import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  SocialLink,
  SocialLinkSchema,
} from "../../schemas/social-link.schema";
import { SocialLinksService } from "./social-links.service";
import { SocialLinksController } from "./social-links.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialLink.name, schema: SocialLinkSchema },
    ]),
  ],
  controllers: [SocialLinksController],
  providers: [SocialLinksService],
  exports: [SocialLinksService],
})
export class SocialLinksModule {}
