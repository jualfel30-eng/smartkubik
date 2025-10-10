import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  RemoveMemberDto,
} from '../../dto/organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req) {
    return this.organizationsService.create(
      createOrganizationDto,
      req.user.userId,
    );
  }

  @Get()
  async findAll(@Request() req) {
    return this.organizationsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.organizationsService.findOne(id, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req,
  ) {
    return this.organizationsService.update(
      id,
      updateOrganizationDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.organizationsService.remove(id, req.user.userId);
    return { message: 'Organization deleted successfully' };
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req,
  ) {
    return this.organizationsService.addMember(id, addMemberDto, req.user.userId);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.organizationsService.removeMember(id, userId, req.user.userId);
  }
}
