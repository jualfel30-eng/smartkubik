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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesión" })
  @ApiResponse({ status: 200, description: "Login exitoso" })
  @ApiResponse({ status: 401, description: "Credenciales inválidas" })
  @ApiResponse({ status: 429, description: "Demasiados intentos. Intente más tarde" })
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        success: true,
        message: "Login exitoso",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error en el login",
        HttpStatus.UNAUTHORIZED,
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
  ) {
    try {
      const result = await this.authService.switchTenant(
        req.user.id,
        switchTenantDto.membershipId,
        switchTenantDto.rememberAsDefault ?? false,
      );

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
  @ApiResponse({ status: 429, description: "Demasiados intentos. Intente más tarde" })
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

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  async googleAuth(@Request() req) {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de Google para OAuth' })
  async googleAuthRedirect(@Request() req, @Res() res) {
    const result = await this.authService.googleLogin(req.user);
    // Redirect to frontend with tokens
    // In a real app, you might want to use a more secure way to pass tokens,
    // like setting a httpOnly cookie.
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.smartkubik.com';
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
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

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar token de acceso" })
  @ApiResponse({ status: 200, description: "Token renovado exitosamente" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshToken(
        refreshTokenDto.refreshToken,
      );
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
  @ApiResponse({ status: 429, description: "Demasiados intentos. Intente más tarde" })
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
  @ApiResponse({ status: 429, description: "Demasiados intentos. Intente más tarde" })
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

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cerrar sesión" })
  @ApiResponse({ status: 200, description: "Sesión cerrada exitosamente" })
  async logout(@Request() req) {
    try {
      await this.authService.logout(req.user.id);
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
