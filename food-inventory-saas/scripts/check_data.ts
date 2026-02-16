
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get<Connection>(getConnectionToken());
    const logger = new Logger('CheckDataScript');

    try {
        const roleModel = connection.model('Role');
        const userModel = connection.model('User');
        const tipsRuleModel = connection.model('TipsDistributionRule');
        const tenantModel = connection.model('Tenant');

        // 1. Find Tenant
        const tenantEmail = 'savageorganicsolutions+test50@gmail.com';
        const user = await userModel.findOne({ email: tenantEmail }).lean() as any;

        if (!user) {
            logger.error(`User with email ${tenantEmail} not found.`);
            process.exit(1);
        }

        const tenantId = user.tenantId;
        logger.log(`Found Tenant ID: ${tenantId}`);

        // 2. Find Role "Mesero"
        const roles = await roleModel.find({
            $or: [
                { name: { $regex: /mesero/i } },
                { name: { $regex: /waiter/i } }
            ]
        }).lean() as any[];

        logger.log(`Found Roles: ${JSON.stringify(roles.map(r => ({ id: r._id, name: r.name, tenantId: r.tenantId })), null, 2)}`);

        let meseroRole = roles.find(r => r.tenantId?.toString() === tenantId.toString());
        if (!meseroRole) {
            meseroRole = roles.find(r => !r.tenantId); // Global role fallback
        }

        if (meseroRole) {
            logger.log(`Selected Mesero Role ID: ${meseroRole._id}`);

            // 3. Count Employees with this Role
            const employees = await userModel.find({
                tenantId: tenantId,
                role: meseroRole._id
            }).lean() as any[];

            logger.log(`Found ${employees.length} employees with role Mesero.`);
            employees.forEach(e => logger.log(` - ${e.firstName} ${e.lastName} (${e.email})`));
        } else {
            logger.warn('No "Mesero" role found matching tenant or global!');
        }

        // 4. Check Tip Rules
        const rules = await tipsRuleModel.find({ tenantId: tenantId }).lean() as any[];
        logger.log(`Found ${rules.length} Tip Distribution Rules.`);
        rules.forEach(r => logger.log(` - ${r.name} (${r.type}) isActive: ${r.isActive}`));

        // 5. Payment Methods (from Tenant Settings)
        const tenant = await tenantModel.findById(tenantId).lean() as any;
        logger.log('Payment Methods Config:');
        if (tenant.settings?.paymentMethods) {
            logger.log(JSON.stringify(tenant.settings.paymentMethods, null, 2));
        } else {
            logger.log('No custom payment methods configured (using defaults).');
        }

    } catch (error) {
        logger.error('Error checking data', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
