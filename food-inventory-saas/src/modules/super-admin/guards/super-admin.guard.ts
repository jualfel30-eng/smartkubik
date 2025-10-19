import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // A super-admin is identified as a user that does NOT have a tenantId.
    if (user && !user.tenantId) {
      return true;
    }

    throw new ForbiddenException(
      "Acceso denegado. Se requiere rol de Super Administrador.",
    );
  }
}
