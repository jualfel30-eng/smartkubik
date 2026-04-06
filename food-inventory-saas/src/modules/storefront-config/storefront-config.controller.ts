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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { StorefrontConfigService } from "./storefront-config.service";
import {
  CreateStorefrontConfigDto,
  UpdateThemeDto,
} from "./dto/create-storefront-config.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@Controller(["admin/storefront-config", "storefront"])
@UseGuards(JwtAuthGuard, TenantGuard)
export class StorefrontConfigController {
  constructor(
    private readonly storefrontConfigService: StorefrontConfigService,
  ) {}

  /**
   * GET /api/v1/storefront
   * Obtener la configuración del storefront del tenant actual (alias del /config)
   */
  @Get()
  async getConfigRoot(@Request() req) {
    return this.storefrontConfigService.getConfig(req.user.tenantId);
  }

  /**
   * GET /api/v1/storefront/config
   * Obtener la configuración del storefront del tenant actual
   */
  @Get("config")
  async getConfig(@Request() req) {
    return this.storefrontConfigService.getConfig(req.user.tenantId);
  }

  /**
   * POST /api/v1/storefront
   * Crear o actualizar la configuración completa del storefront (alias del /config)
   */
  @Post()
  async createConfigRoot(
    @Request() req,
    @Body() createDto: CreateStorefrontConfigDto,
  ) {
    return this.storefrontConfigService.upsertConfig(
      req.user.tenantId,
      createDto,
    );
  }

  /**
   * POST /api/v1/storefront/config
   * Crear o actualizar la configuración completa del storefront
   */
  @Post("config")
  async upsertConfig(
    @Request() req,
    @Body() createDto: CreateStorefrontConfigDto,
  ) {
    return this.storefrontConfigService.upsertConfig(
      req.user.tenantId,
      createDto,
    );
  }

  /**
   * PUT /api/v1/storefront/theme
   * Actualizar solo el tema (colores, logo, favicon)
   */
  @Put("theme")
  async updateTheme(@Request() req, @Body() updateThemeDto: UpdateThemeDto) {
    return this.storefrontConfigService.updateTheme(
      req.user.tenantId,
      updateThemeDto,
    );
  }

  /**
   * PUT /api/v1/storefront/toggle
   * Activar o desactivar el storefront
   */
  @Put("toggle")
  async toggleActive(@Request() req, @Body("isActive") isActive: boolean) {
    return this.storefrontConfigService.toggleActive(
      req.user.tenantId,
      isActive,
    );
  }

  /**
   * PUT /api/v1/storefront/custom-css
   * Actualizar CSS personalizado
   */
  @Put("custom-css")
  async updateCustomCSS(@Request() req, @Body("customCSS") customCSS: string) {
    return this.storefrontConfigService.updateCustomCSS(
      req.user.tenantId,
      customCSS,
    );
  }

  /**
   * POST /api/v1/storefront/upload-logo
   * Subir logo del storefront
   */
  @Post("upload-logo")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/storefront/logos",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `logo-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          return callback(
            new BadRequestException(
              "Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP, SVG)",
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  )
  async uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No se proporcionó ningún archivo");
    }

    const baseUrl =
      process.env.API_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const logoUrl = `${baseUrl}/uploads/storefront/logos/${file.filename}`;

    const updatedConfig = await this.storefrontConfigService.uploadLogo(
      req.user.tenantId,
      logoUrl,
    );

    return {
      success: true,
      data: {
        logo: logoUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      },
      config: updatedConfig,
    };
  }

  /**
   * POST /api/v1/storefront/upload-favicon
   * Subir favicon del storefront
   */
  @Post("upload-favicon")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/storefront/favicons",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `favicon-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(x-icon|png|vnd\.microsoft\.icon)$/)) {
          return callback(
            new BadRequestException(
              "Solo se permiten archivos ICO o PNG para favicon",
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 500 * 1024, // 500KB
      },
    }),
  )
  async uploadFavicon(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No se proporcionó ningún archivo");
    }

    const baseUrl =
      process.env.API_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const faviconUrl = `${baseUrl}/uploads/storefront/favicons/${file.filename}`;

    const updatedConfig = await this.storefrontConfigService.uploadFavicon(
      req.user.tenantId,
      faviconUrl,
    );

    return {
      success: true,
      data: {
        favicon: faviconUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      },
      config: updatedConfig,
    };
  }

  /**
   * POST /api/v1/storefront/upload-banner
   * Subir imagen de banner para la sección Hero
   */
  @Post("upload-banner")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/storefront/banners",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `banner-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException(
              "Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)",
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadBanner(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No se proporcionó ningún archivo");
    }

    const baseUrl =
      process.env.API_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const bannerUrl = `${baseUrl}/uploads/storefront/banners/${file.filename}`;

    const updatedConfig = await this.storefrontConfigService.uploadBanner(
      req.user.tenantId,
      bannerUrl,
    );

    return {
      success: true,
      data: {
        bannerUrl: bannerUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      },
      config: updatedConfig,
    };
  }

  /**
   * POST /api/v1/storefront/upload-video
   * Subir video de fondo para la sección Hero
   */
  @Post("upload-video")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/storefront/videos",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `video-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(mp4|webm|ogg)$/)) {
          return callback(
            new BadRequestException(
              "Solo se permiten archivos de video (MP4, WEBM, OGG)",
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadVideo(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No se proporcionó ningún archivo");
    }

    const baseUrl =
      process.env.API_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const videoUrl = `${baseUrl}/uploads/storefront/videos/${file.filename}`;

    const updatedConfig = await this.storefrontConfigService.uploadVideo(
      req.user.tenantId,
      videoUrl,
    );

    return {
      success: true,
      data: {
        videoUrl: videoUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      },
      config: updatedConfig,
    };
  }

  /**
   * DELETE /api/v1/storefront/config
   * Eliminar la configuración del storefront
   */
  @Delete("config")
  async deleteConfig(@Request() req) {
    await this.storefrontConfigService.deleteConfig(req.user.tenantId);
    return { message: "Configuración del storefront eliminada exitosamente" };
  }

  /**
   * GET /api/v1/storefront/check-domain
   * Verificar si un dominio está disponible
   */
  @Get("check-domain")
  async checkDomain(@Request() req, @Query("domain") domain: string) {
    if (!domain) {
      throw new BadRequestException("El parámetro domain es requerido");
    }

    const isAvailable = await this.storefrontConfigService.isDomainAvailable(
      domain,
      req.user.tenantId,
    );

    return { domain, isAvailable };
  }

  /**
   * GET /api/v1/storefront/public/:domain
   * Obtener configuración pública por dominio (sin autenticación)
   * Este endpoint será usado por el storefront público
   */
  @Get("public/:domain")
  async getPublicConfig(@Param("domain") domain: string) {
    return this.storefrontConfigService.getConfigByDomain(domain);
  }
}
