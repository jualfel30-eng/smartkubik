
import { Injectable } from '@nestjs/common';
import { ALL_PERMISSIONS } from './constants';

@Injectable()
export class PermissionsService {
  findAll() {
    return ALL_PERMISSIONS;
  }
}
