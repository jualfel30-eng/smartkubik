import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { EduAuthService } from "./edu-auth.service";
import { StudentLoginDto } from "./dto/student-login.dto";
import { Public } from "../../decorators/public.decorator";

@ApiTags("education-auth")
@Controller("education/auth")
export class EduAuthController {
  constructor(private readonly eduAuthService: EduAuthService) {}

  @Public()
  @Post("student/login")
  @ApiOperation({ summary: "Login de alumno — retorna JWT con type: edu_student" })
  async studentLogin(
    @Body() dto: StudentLoginDto,
    @Headers("x-tenant-id") tenantId: string,
  ) {
    try {
      const result = await this.eduAuthService.studentLogin(dto, tenantId);
      return { success: true, ...result };
    } catch (error) {
      throw new HttpException(
        error.message || "Error en autenticación",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
