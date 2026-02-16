import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AddCountryCodeMigration {
  private readonly logger = new Logger(AddCountryCodeMigration.name);

  constructor(@InjectConnection() private connection: Connection) {}

  async run(): Promise<{ updated: number }> {
    this.logger.log('Starting AddCountryCode migration...');

    const result = await this.connection.db
      .collection('tenants')
      .updateMany(
        { countryCode: { $exists: false } },
        { $set: { countryCode: 'VE' } },
      );

    this.logger.log(
      `AddCountryCode migration complete: ${result.modifiedCount} tenants updated`,
    );

    return { updated: result.modifiedCount };
  }
}
