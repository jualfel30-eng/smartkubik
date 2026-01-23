
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get<Connection>(getConnectionToken());
    const logger = new Logger('DeleteTestWaiters');

    try {
        const userModel = connection.model('User');
        const roleModel = connection.model('Role');
        const employeeProfileModel = connection.model('EmployeeProfile');

        const tenantEmail = 'savageorganicsolutions+test50@gmail.com';
        const adminUser = await userModel.findOne({ email: tenantEmail }).exec();

        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        const tenantId = adminUser.tenantId;

        let meseroRole = await roleModel.findOne({ name: 'Mesero', tenantId }).lean() as any;
        if (meseroRole) {
            const deleted = await userModel.deleteMany({
                tenantId,
                role: meseroRole._id,
                email: { $regex: /mesero_test_/ } // careful deletion
            });
            logger.log(`Deleted ${deleted.deletedCount} existing test waiters.`);

            // Also clean profiles if any
            await employeeProfileModel.deleteMany({
                tenantId,
                position: 'Mesero'
                // Could filter by employeeNumber regex if needed
            });
            logger.log('Cleaned up profiles.');
        }

    } catch (error) {
        logger.error('Error deleting data', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
