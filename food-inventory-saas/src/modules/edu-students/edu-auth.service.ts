import { Injectable, UnauthorizedException, BadRequestException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { EduStudentsService } from "./edu-students.service";
import { StudentLoginDto } from "./dto/student-login.dto";

export interface EduStudentJwtPayload {
  type: "edu_student";
  sub: string;
  studentId: string;
  tenantId: string;
  name: string;
  email: string;
  academicYear: string;
}

@Injectable()
export class EduAuthService {
  private readonly logger = new Logger(EduAuthService.name);

  constructor(
    private readonly studentsService: EduStudentsService,
    private readonly jwtService: JwtService,
  ) {}

  async studentLogin(dto: StudentLoginDto, tenantId: string): Promise<{ token: string; student: any }> {
    if (!tenantId) {
      throw new BadRequestException("X-Tenant-ID header es obligatorio");
    }

    const student = await this.studentsService.findByEmailAndTenant(dto.email, tenantId);

    if (!student || !student.passwordHash) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    if (student.tenantId.toString() !== tenantId) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    const isValid = await bcrypt.compare(dto.password, student.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    if (student.status === "withdrawn" || student.status === "suspended") {
      throw new UnauthorizedException("La cuenta del alumno está inactiva");
    }

    const payload: EduStudentJwtPayload = {
      type: "edu_student",
      sub: student._id.toString(),
      studentId: student._id.toString(),
      tenantId: student.tenantId.toString(),
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      academicYear: student.academicYear,
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`EduStudent login: ${student.email} (tenant: ${tenantId})`);

    return {
      token,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        enrollmentNumber: student.enrollmentNumber,
        academicYear: student.academicYear,
        status: student.status,
        classroomId: student.classroomId,
      },
    };
  }
}
