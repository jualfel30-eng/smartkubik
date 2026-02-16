
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = app.get<Connection>(getConnectionToken());
    const logger = new Logger('SeedTipsData');

    try {
        const roleModel = connection.model('Role');
        const userModel = connection.model('User');
        const tipsRuleModel = connection.model('TipsDistributionRule');
        const employeeProfileModel = connection.model('EmployeeProfile');
        const customerModel = connection.model('Customer');


        const tenantEmail = 'savageorganicsolutions+test50@gmail.com';
        const adminUser = await userModel.findOne({ email: tenantEmail }).lean() as any;

        if (!adminUser) {
            logger.error(`User with email ${tenantEmail} not found.`);
            process.exit(1);
        }

        const tenantId = adminUser.tenantId;
        logger.log(`Found Tenant ID: ${tenantId}`);

        // ==========================================
        // 1. Ensure Role "Mesero" exists
        // ==========================================
        // Use : any explicit casting to avoid TS errors on lean() results
        let meseroRole = await roleModel.findOne({
            tenantId: tenantId,
            name: 'Mesero'
        }).lean() as any;

        if (!meseroRole) {
            meseroRole = await roleModel.findOne({
                tenantId: tenantId,
                $or: [{ name: /waiter/i }, { name: /mesero/i }]
            }).lean() as any;
        }

        let meseroRoleId;

        if (!meseroRole) {
            logger.log('Creating Role "Mesero"...');
            const permissions = ['orders.create', 'orders.read', 'orders.update'];
            const newRole = new roleModel({
                name: 'Mesero',
                description: 'Role for waiters handling orders and tips',
                permissions,
                tenantId: tenantId,
                isSystem: false
            });
            await newRole.save();
            meseroRoleId = newRole._id;
            logger.log(`Created Role Mesero: ${meseroRoleId}`);
        } else {
            meseroRoleId = meseroRole._id;
            logger.log(`Role Mesero already exists: ${meseroRoleId}`);
        }

        // ==========================================
        // 2. Ensure at least 3 Employees with "Mesero" role
        // ==========================================
        const existingWaiters = await userModel.find({
            tenantId: tenantId,
            role: meseroRoleId
        }).lean() as any[];

        logger.log(`Found ${existingWaiters.length} existing waiters.`);

        const waitersNeeded = 3 - existingWaiters.length;
        if (waitersNeeded > 0) {
            logger.log(`Creating ${waitersNeeded} new waiters...`);
            const passwordHash = await bcrypt.hash('123456', 10);

            for (let i = 1; i <= waitersNeeded; i++) {
                const timestamp = Date.now();
                const waiter = new userModel({
                    firstName: `MeseroTest`,
                    lastName: `${existingWaiters.length + i}`,
                    email: `mesero_test_${timestamp}_${i}@savage.com`,
                    password: passwordHash,
                    role: meseroRoleId,
                    tenantId: tenantId,
                    isActive: true,
                    isEmailVerified: true
                });
                await waiter.save();
                logger.log(`Created waiter user: ${waiter.email}`);

                // Create linked Customer (required for EmployeeProfile as per schema)
                const customer = await new customerModel({
                    name: `${waiter.firstName} ${waiter.lastName}`,
                    customerNumber: `CUST-${timestamp}-${i}`,
                    customerType: 'individual',
                    firstName: waiter.firstName,
                    lastName: waiter.lastName,
                    email: waiter.email,
                    tenantId: tenantId,
                    createdBy: adminUser._id,
                    source: 'manual',
                    status: 'active'
                }).save();

                // Create EmployeeProfile
                await new employeeProfileModel({
                    tenantId: tenantId,
                    userId: waiter._id,
                    customerId: customer._id,
                    employeeNumber: `EMP-${timestamp}-${i}`,
                    position: 'Mesero',
                    department: 'Servicio',
                    status: 'active',
                    hireDate: new Date()
                }).save();
                logger.log(`Created EmployeeProfile for: ${waiter.email}`);
            }
        }

        // ==========================================
        // 3. Ensure Tip Distribution Rules exist
        // ==========================================
        const rules = [
            {
                name: 'Distribución Equitativa (Standard)',
                type: 'equal',
                isActive: true, // Make this one active
                rules: {
                    includedRoles: ['Mesero'], // Using name matching
                    poolTips: true
                }
            },
            {
                name: 'Por Ventas Individuales (Incentivo)',
                type: 'by-sales',
                isActive: false,
                rules: {
                    includedRoles: ['Mesero'],
                    salesWeight: 1,
                    poolTips: false
                }
            },
            {
                name: 'Por Horas Trabajadas (Justo)',
                type: 'by-hours',
                isActive: false,
                rules: {
                    includedRoles: ['Mesero'],
                    hourlyWeight: 1,
                    poolTips: true
                }
            }
        ];

        for (const ruleDef of rules) {
            // Deactivate others if we are activating one (simple logic)
            if (ruleDef.isActive) {
                await tipsRuleModel.updateMany({ tenantId: tenantId }, { isActive: false });
            }

            const existingRef = await tipsRuleModel.findOne({
                tenantId: tenantId,
                type: ruleDef.type,
                name: ruleDef.name
            }).exec();

            if (!existingRef) {
                logger.log(`Creating rule: ${ruleDef.name}`);
                await new tipsRuleModel({
                    ...ruleDef,
                    tenantId: tenantId,
                    createdBy: adminUser._id
                }).save();
            } else {
                logger.log(`Rule "${ruleDef.name}" already exists. Updating active status.`);
                if (ruleDef.isActive) {
                    await tipsRuleModel.updateOne({ _id: existingRef._id }, { isActive: true });
                }
            }
        }

        logger.log('Seeding completed successfully.');

    } catch (error) {
        logger.error('Error seeding data', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
