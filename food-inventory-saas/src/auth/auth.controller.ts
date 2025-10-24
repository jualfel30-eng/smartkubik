import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  HttpException,
  Res,
  Req,
  Logger,
  Delete,
  Param,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  RegisterDto,
  CreateUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  SwitchTenantDto,
} from "../dto/auth.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { TenantGuard } from "../guards/tenant.guard";
import { PermissionsGuard } from "../guards/permissions.guard";
import { Permissions } from "../decorators/permissions.decorator";
import { Public } from "../decorators/public.decorator";
import type { Response, Request as ExpressRequest } from "express";
import { setAuthCookies, clearAuthCookies } from "./auth-cookie.util";

type RequestWithCookies = ExpressRequest & {
  cookies?: Record<string, string | undefined>;
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesión" })
  @ApiResponse({ status: 200, description: "Login exitoso" })
  @ApiResponse({ status: 401, description: "Credenciales inválidas" })
  @ApiResponse({
    status: 429,
    description: "Demasiados intentos. Intente más tarde",
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const ip = loginDto.ip ?? req.ip;
      loginDto.ip = ip;
      const userAgent =
        typeof req.get === "function"
          ? (req.get("user-agent") ?? undefined)
          : undefined;
      const sessionContext = {
        ip,
        userAgent,
      };
      const result = await this.authService.login(
        loginDto,
        false,
        undefined,
        sessionContext,
      );
      setAuthCookies(res, result);
      return {
        success: true,
        message: "Login exitoso",
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const fallbackMessage = () => {
        try {
          return JSON.stringify(error);
        } catch {
          return String(error);
        }
      };
      const errorMessage =
        error instanceof Error ? error.message : fallbackMessage();
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login request failed: ${errorMessage}`, errorStack);

      throw new HttpException(
        "Error en el login",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("switch-tenant")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cambiar el tenant activo del usuario autenticado" })
  @ApiResponse({ status: 200, description: "Tenant cambiado exitosamente" })
  async switchTenant(
    @Body() switchTenantDto: SwitchTenantDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.switchTenant(
        req.user.id,
        switchTenantDto.membershipId,
        req.user.sessionId,
        switchTenantDto.rememberAsDefault ?? false,
        {
          ip: req.ip,
          userAgent:
            typeof req.get === "function"
              ? (req.get("user-agent") ?? undefined)
              : undefined,
        },
      );

      setAuthCookies(res, result);

      return {
        success: true,
        message: "Tenant cambiado exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudo cambiar de tenant",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Post("register")
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 registros por minuto
  @ApiOperation({ summary: "Registrar nuevo usuario" })
  @ApiResponse({ status: 201, description: "Usuario registrado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos inválidos" })
  @ApiResponse({
    status: 429,
    description: "Demasiados intentos. Intente más tarde",
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: "Usuario registrado exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error en el registro",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("google")
  @Public()
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Iniciar sesión con Google" })
  async googleAuth(@Request() req) {
    // Initiates the Google OAuth2 login flow
  }

  @Get("google/callback")
  @Public()
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Callback de Google para OAuth" })
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user, {
      ip: req.ip,
      userAgent:
        typeof req.get === "function"
          ? (req.get("user-agent") ?? undefined)
          : undefined,
    });
    setAuthCookies(res, result);
    const frontendUrl = process.env.FRONTEND_URL || "https://smartkubik.com";
    res.redirect(`${frontendUrl}/auth/callback?provider=google`);
  }

  @Post("create-user")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("users_create")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear nuevo usuario (solo administradores)" })
  @ApiResponse({ status: 201, description: "Usuario creado exitosamente" })
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    try {
      const result = await this.authService.createUser(createUserDto, req.user);
      return {
        success: true,
        message: "Usuario creado exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear usuario",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("users/:userId/sessions")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("users_read")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar sesiones de un usuario del tenant" })
  async listTenantUserSessions(
    @Request() req,
    @Param("userId") userId: string,
    @Query("includeRevoked") includeRevoked: string = "false",
  ) {
    try {
      await this.authService.ensureActorCanManageUserSessions(req.user, userId);

      const sessions = await this.authService.listSessionsForUser(userId, {
        includeRevoked: includeRevoked === "true",
      });

      return {
        success: true,
        data: { sessions },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudieron listar las sesiones del usuario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("users/:userId/sessions/:sessionId")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("users_update")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revocar una sesión específica de un usuario" })
  async revokeTenantUserSession(
    @Request() req,
    @Param("userId") userId: string,
    @Param("sessionId") sessionId: string,
  ) {
    try {
      await this.authService.ensureActorCanManageUserSessions(req.user, userId);

      const result = await this.authService.revokeSessionForUser(
        userId,
        sessionId,
        {
          reason: "admin_manual_revocation",
        },
      );

      return {
        success: true,
        data: result.updated,
        alreadyRevoked: result.alreadyRevoked,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudo revocar la sesión del usuario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("users/:userId/sessions/revoke-all")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("users_update")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revocar todas las sesiones activas de un usuario" })
  async revokeAllSessionsForTenantUser(
    @Request() req,
    @Param("userId") userId: string,
  ) {
    try {
      await this.authService.ensureActorCanManageUserSessions(req.user, userId);

      const revokedCount = await this.authService.revokeAllSessionsForUser(
        userId,
        {
          reason: "admin_bulk_revocation",
        },
      );

      return {
        success: true,
        revokedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudieron revocar las sesiones del usuario",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar token de acceso" })
  @ApiResponse({ status: 200, description: "Token renovado exitosamente" })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const tokenFromBody = refreshTokenDto.refreshToken;
      const tokenFromCookie = req.cookies?.sk_refresh_token;
      const refreshToken = tokenFromBody || tokenFromCookie;

      if (!refreshToken) {
        throw new HttpException(
          "Refresh token no proporcionado",
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.refreshToken(refreshToken, {
        ip: req.ip,
        userAgent:
          typeof req.get === "function"
            ? (req.get("user-agent") ?? undefined)
            : undefined,
      });
      setAuthCookies(res, result);
      return {
        success: true,
        message: "Token renovado exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al renovar token",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cambiar contraseña" })
  @ApiResponse({ status: 200, description: "Contraseña cambiada exitosamente" })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    try {
      await this.authService.changePassword(changePasswordDto, req.user);
      return {
        success: true,
        message: "Contraseña cambiada exitosamente",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al cambiar contraseña",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Post("forgot-password")
  @Throttle({ short: { limit: 3, ttl: 300000 } }) // 3 intentos por 5 minutos
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Solicitar reseteo de contraseña" })
  @ApiResponse({ status: 200, description: "Email de reseteo enviado" })
  @ApiResponse({
    status: 429,
    description: "Demasiados intentos. Intente más tarde",
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      await this.authService.forgotPassword(forgotPasswordDto);
      return {
        success: true,
        message:
          "Si el email existe, recibirá instrucciones para resetear su contraseña",
      };
    } catch (error) {
      // No revelar si el email existe o no por seguridad
      return {
        success: true,
        message:
          "Si el email existe, recibirá instrucciones para resetear su contraseña",
      };
    }
  }

  @Public()
  @Post("reset-password")
  @Throttle({ short: { limit: 5, ttl: 600000 } }) // 5 intentos por 10 minutos
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resetear contraseña con token" })
  @ApiResponse({
    status: 200,
    description: "Contraseña reseteada exitosamente",
  })
  @ApiResponse({
    status: 429,
    description: "Demasiados intentos. Intente más tarde",
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(resetPasswordDto);
      return {
        success: true,
        message: "Contraseña reseteada exitosamente",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al resetear contraseña",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener perfil del usuario actual" })
  @ApiResponse({ status: 200, description: "Perfil obtenido exitosamente" })
  async getProfile(@Request() req) {
    try {
      const profile = await this.authService.getProfile(req.user.id);
      return {
        success: true,
        message: "Perfil obtenido exitosamente",
        data: profile,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener perfil",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener información del usuario actual" })
  @ApiResponse({ status: 200, description: "Usuario obtenido exitosamente" })
  async getMe(@Request() req) {
    try {
      const profile = await this.authService.getProfile(req.user.id);
      return profile;
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener usuario",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("session")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener el contexto de sesión actual" })
  @ApiResponse({ status: 200, description: "Sesión recuperada exitosamente" })
  async getSession(@Request() req) {
    try {
      const session = await this.authService.getSessionSnapshot(
        req.user.id,
        req.user.membershipId ?? null,
      );

      return {
        success: true,
        message: "Sesión recuperada exitosamente",
        data: session,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudo recuperar la sesión",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar sesiones activas del usuario actual" })
  async listMySessions(
    @Request() req,
    @Query("includeRevoked") includeRevoked: string = "false",
  ) {
    try {
      const sessions = await this.authService.listSessionsForUser(req.user.id, {
        includeRevoked: includeRevoked === "true",
        currentSessionId: req.user.sessionId ?? null,
      });

      return {
        success: true,
        data: { sessions },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudieron listar las sesiones",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("sessions/:sessionId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revocar una sesión específica del usuario actual" })
  async revokeMySession(
    @Request() req,
    @Param("sessionId") sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const isCurrentSession =
        req.user.sessionId && req.user.sessionId === sessionId;
      const result = await this.authService.revokeSessionForUser(
        req.user.id,
        sessionId,
        {
          reason: isCurrentSession
            ? "user_manual_self_revocation"
            : "user_manual_remote_revocation",
          currentSessionId: req.user.sessionId ?? null,
        },
      );

      if (isCurrentSession && !result.alreadyRevoked) {
        clearAuthCookies(res);
      }

      return {
        success: true,
        data: result.updated,
        alreadyRevoked: result.alreadyRevoked,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudo revocar la sesión",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("sessions/revoke-others")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Revocar todas las demás sesiones activas del usuario",
  })
  async revokeOtherSessions(@Request() req) {
    try {
      const excludeIds = req.user.sessionId ? [req.user.sessionId] : [];
      const revokedCount = await this.authService.revokeAllSessionsForUser(
        req.user.id,
        {
          reason: "user_bulk_remote_revocation",
          excludeSessionIds: excludeIds,
        },
      );

      return {
        success: true,
        revokedCount,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "No se pudieron revocar las sesiones",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cerrar sesión" })
  @ApiResponse({ status: 200, description: "Sesión cerrada exitosamente" })
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies?.sk_refresh_token;
      await this.authService.logout(
        req.user.id,
        req.user.sessionId,
        refreshToken,
      );
      clearAuthCookies(res);
      return {
        success: true,
        message: "Sesión cerrada exitosamente",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al cerrar sesión",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("validate")
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validar token actual" })
  @ApiResponse({ status: 200, description: "Token válido" })
  async validateToken(@Request() req) {
    return {
      success: true,
      message: "Token válido",
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          tenantId: req.user.tenantId,
        },
        tenant: {
          id: req.tenant._id,
          code: req.tenant.code,
          name: req.tenant.name,
        },
      },
    };
  }
}
