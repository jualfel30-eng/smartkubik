import { SetMetadata } from "@nestjs/common";

// Simple permissions decorator. Expects an array of permissions strings.
export const Permissions = (...permissions: string[]) =>
  SetMetadata("permissions", permissions);
