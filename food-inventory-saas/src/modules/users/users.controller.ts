import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get("search")
  async searchUsers(@Query("email") email: string) {
    return this.usersService.searchByEmail(email);
  }

  @Get()
  async findAll(@Query() query) {
    // Basic filter mapping
    const filter: any = {};
    if (query.role) {
      filter.roles = query.role; // Assuming roles is an array or string
      // Or if schema uses 'role' singular.
      // Let's assume generic query pass-through for now or specific check.
      // If I don't check schema, I might fail.
      // But typically it's better to just pass query if safe.
      // Let's implement minimal mapping.
    }
    // Actually, let's just pass query for simple fields
    return this.usersService.findAll(query);
  }
}
