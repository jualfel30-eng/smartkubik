import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  Param,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { TenantService } from "./tenant.service";
import {
  UpdateTenantSettingsDto,
  InviteUserDto,
  UpdateUserDto,
} from "./dto/tenant.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { RequirePermissions } from "./decorators/permissions.decorator";

@ApiTags("tenant")
@Controller("tenant")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post("logo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Logo a subir",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiOperation({ summary: "Subir o actualizar el logo del tenant" })
  @ApiResponse({ status: 200, description: "Logo actualizado exitosamente" })
  async uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
    try {
      const updatedTenant = await this.tenantService.uploadLogo(
        req.user.tenantId,
        file,
      );
      return {
        success: true,
        message: "Logo actualizado exitosamente",
        data: { logo: updatedTenant.logo },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al subir el logo",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("settings")
  @ApiOperation({ summary: "Obtener la configuración del tenant" })
  @ApiResponse({
    status: 200,
    description: "Configuración obtenida exitosamente",
  })
  async getSettings(@Request() req) {
    try {
      const settings = await this.tenantService.getSettings(req.user.tenantId);
      return {
        success: true,
        message: "Configuración obtenida exitosamente",
        data: settings,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener la configuración",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("settings")
  @ApiOperation({ summary: "Actualizar la configuración del tenant" })
  @ApiResponse({
    status: 200,
    description: "Configuración actualizada exitosamente",
  })
  async updateSettings(
    @Request() req,
    @Body() updateDto: UpdateTenantSettingsDto,
  ) {
    try {
      const updatedSettings = await this.tenantService.updateSettings(
        req.user.tenantId,
        updateDto,
      );
      return {
        success: true,
        message: "Configuración actualizada exitosamente",
        data: updatedSettings,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar la configuración",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("users")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users", ["read"])
  @ApiOperation({ summary: "Obtener la lista de usuarios del tenant" })
  @ApiResponse({ status: 200, description: "Usuarios obtenidos exitosamente" })
  async getUsers(@Request() req) {
    try {
      const users = await this.tenantService.getUsers(req.user.tenantId);
      return {
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: users,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener los usuarios",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("users")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users", ["create"])
  @ApiOperation({ summary: "Invitar a un nuevo usuario al tenant" })
  @ApiResponse({ status: 201, description: "Usuario invitado exitosamente" })
  async inviteUser(@Request() req, @Body() inviteUserDto: InviteUserDto) {
    try {
      const newUser = await this.tenantService.inviteUser(
        req.user.tenantId,
        inviteUserDto,
      );
      return {
        success: true,
        message: "Usuario invitado exitosamente",
        data: newUser,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al invitar al usuario",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put("users/:userId")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users", ["update"])
  @ApiOperation({ summary: "Actualizar un usuario del tenant" })
  @ApiResponse({ status: 200, description: "Usuario actualizado exitosamente" })
  async updateUser(
    @Request() req,
    @Param("userId") userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    try {
      const updatedUser = await this.tenantService.updateUser(
        req.user.tenantId,
        userId,
        updateUserDto,
      );
      return {
        success: true,
        message: "Usuario actualizado exitosamente",
        data: updatedUser,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar el usuario",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete("users/:userId")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users", ["delete"])
  @ApiOperation({ summary: "Eliminar un usuario del tenant" })
  @ApiResponse({ status: 200, description: "Usuario eliminado exitosamente" })
  async deleteUser(@Request() req, @Param("userId") userId: string) {
    try {
      const result = await this.tenantService.deleteUser(
        req.user.tenantId,
        userId,
        req.user.id,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar el usuario",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}