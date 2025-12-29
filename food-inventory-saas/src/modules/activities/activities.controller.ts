import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ActivitiesService } from "./activities.service";
import {
  CreateActivityDto,
  UpdateActivityDto,
  QueryActivitiesDto,
} from "../../dto/activity.dto";

@ApiTags("Activities")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new activity" })
  async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    const activity = await this.activitiesService.create(
      createActivityDto,
      req.user,
    );
    return {
      success: true,
      data: activity,
      message: "Activity created successfully",
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all activities with filters" })
  async findAll(@Query() query: QueryActivitiesDto, @Request() req) {
    const activities = await this.activitiesService.findAll(query, req.user);
    return {
      success: true,
      data: activities,
      count: activities.length,
    };
  }

  @Get("pending-tasks")
  @ApiOperation({ summary: "Get pending tasks" })
  async findPendingTasks(@Request() req) {
    const tasks = await this.activitiesService.findPendingTasks(req.user);
    return {
      success: true,
      data: tasks,
      count: tasks.length,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get activity by ID" })
  async findOne(@Param("id") id: string, @Request() req) {
    const activity = await this.activitiesService.findOne(id, req.user);
    return {
      success: true,
      data: activity,
    };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update activity" })
  async update(
    @Param("id") id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Request() req,
  ) {
    const activity = await this.activitiesService.update(
      id,
      updateActivityDto,
      req.user,
    );
    return {
      success: true,
      data: activity,
      message: "Activity updated successfully",
    };
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Mark activity as completed" })
  async markAsCompleted(@Param("id") id: string, @Request() req) {
    const activity = await this.activitiesService.markAsCompleted(
      id,
      req.user,
    );
    return {
      success: true,
      data: activity,
      message: "Activity marked as completed",
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete activity" })
  async remove(@Param("id") id: string, @Request() req) {
    await this.activitiesService.remove(id, req.user);
    return {
      success: true,
      message: "Activity deleted successfully",
    };
  }
}
