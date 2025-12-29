import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { PlaybooksService } from "./playbooks.service";
import {
  CreatePlaybookDto,
  UpdatePlaybookDto,
  ExecutePlaybookDto,
} from "../../dto/playbook.dto";

@ApiTags("Playbooks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("playbooks")
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Post()
  @ApiOperation({ summary: "Create a new playbook" })
  async create(@Body() createPlaybookDto: CreatePlaybookDto, @Request() req) {
    const playbook = await this.playbooksService.create(
      createPlaybookDto,
      req.user,
    );
    return {
      success: true,
      data: playbook,
      message: "Playbook created successfully",
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all playbooks" })
  async findAll(@Request() req) {
    const playbooks = await this.playbooksService.findAll(req.user);
    return {
      success: true,
      data: playbooks,
      count: playbooks.length,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get playbook by ID" })
  async findOne(@Param("id") id: string, @Request() req) {
    const playbook = await this.playbooksService.findOne(id, req.user);
    return {
      success: true,
      data: playbook,
    };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update playbook" })
  async update(
    @Param("id") id: string,
    @Body() updatePlaybookDto: UpdatePlaybookDto,
    @Request() req,
  ) {
    const playbook = await this.playbooksService.update(
      id,
      updatePlaybookDto,
      req.user,
    );
    return {
      success: true,
      data: playbook,
      message: "Playbook updated successfully",
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete playbook" })
  async remove(@Param("id") id: string, @Request() req) {
    await this.playbooksService.remove(id, req.user);
    return {
      success: true,
      message: "Playbook deleted successfully",
    };
  }

  @Post(":id/execute")
  @ApiOperation({ summary: "Execute playbook for an opportunity" })
  async execute(
    @Param("id") id: string,
    @Body() executePlaybookDto: ExecutePlaybookDto,
    @Request() req,
  ) {
    await this.playbooksService.executePlaybook(
      id,
      executePlaybookDto.opportunityId,
      req.user,
    );
    return {
      success: true,
      message: "Playbook execution scheduled successfully",
    };
  }
}
