import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { Public } from "../../decorators/public.decorator";
import { SocialLinksService } from "./social-links.service";

@ApiTags("Social Links")
@Controller("social-links")
export class SocialLinksController {
  constructor(private readonly socialLinksService: SocialLinksService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Get active social links (public)" })
  async getPublicLinks(@Query("tenantId") tenantId?: string) {
    return this.socialLinksService.getLinks(tenantId || null);
  }

  @Get("manage")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all social links for management" })
  async getManageLinks(@Req() req: any) {
    const tenantId = req.user?.tenantId || null;
    return this.socialLinksService.getManageLinks(tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a social link" })
  async createLink(@Req() req: any, @Body() dto: any) {
    const tenantId = req.user?.tenantId || null;
    return this.socialLinksService.createLink(tenantId, dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a social link" })
  async updateLink(@Param("id") id: string, @Body() dto: any) {
    return this.socialLinksService.updateLink(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a social link" })
  async deleteLink(@Param("id") id: string) {
    return this.socialLinksService.deleteLink(id);
  }

  @Patch("reorder/bulk")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reorder social links" })
  async reorderLinks(@Req() req: any, @Body() body: { orderedIds: string[] }) {
    const tenantId = req.user?.tenantId || null;
    return this.socialLinksService.reorderLinks(tenantId, body.orderedIds);
  }
}
