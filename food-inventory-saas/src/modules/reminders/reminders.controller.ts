import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { RemindersService } from "./reminders.service";
import { CreateReminderDto, QueryRemindersDto } from "../../dto/reminder.dto";

@ApiTags("Reminders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reminders")
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @ApiOperation({ summary: "Create a reminder" })
  async create(@Body() createReminderDto: CreateReminderDto, @Request() req) {
    const reminder = await this.remindersService.create(createReminderDto, req.user);
    return {
      success: true,
      data: reminder,
      message: "Reminder created successfully",
    };
  }

  @Get()
  @ApiOperation({ summary: "Get all reminders with filters" })
  async findAll(@Query() query: QueryRemindersDto, @Request() req) {
    const reminders = await this.remindersService.findAll(query, req.user);
    return {
      success: true,
      data: reminders,
      count: reminders.length,
    };
  }

  @Get("pending")
  @ApiOperation({ summary: "Get pending reminders for current user" })
  async findPendingByUser(@Request() req) {
    const reminders = await this.remindersService.findPendingByUser(
      req.user.id,
      req.user.tenantId,
    );
    return {
      success: true,
      data: reminders,
      count: reminders.length,
    };
  }

  @Delete(":id/cancel")
  @ApiOperation({ summary: "Cancel a reminder" })
  async cancel(@Param("id") id: string, @Request() req) {
    const reminder = await this.remindersService.cancel(id, req.user);
    return {
      success: true,
      data: reminder,
      message: "Reminder cancelled successfully",
    };
  }
}
