
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TipsService } from '../src/modules/tips/tips.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { Connection, Types } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const tipsService = app.get(TipsService);
    const ordersService = app.get(OrdersService);
    const connection = app.get<Connection>(getConnectionToken());
    const logger = new Logger('SimulateTipsFlow');
    const resultFile = path.join(__dirname, 'simulation_result.txt');

    try {
        const userModel = connection.model('User');
        const productModel = connection.model('Product');
        const roleModel = connection.model('Role');
        const orderModel = connection.model('Order');

        const tenantEmail = 'savageorganicsolutions+test50@gmail.com';
        const adminUser = await userModel.findOne({ email: tenantEmail }).exec();

        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        const tenantId = adminUser.tenantId;
        const tenantIdStr = tenantId.toString();

        // 1. Get a Product to sell
        let product = await productModel.findOne({ tenantId }).exec();
        if (!product) {
            product = new productModel({
                name: 'Dummy Product for Tips',
                sku: `DUMMY-${Date.now()}`,
                tenantId: tenantId,
                basePrice: 10,
                costPrice: 5,
                stock: 100,
                status: 'active',
                productType: 'simple',
                category: ['General'],
                subcategory: ['General'],
                brand: 'Generic',
                taxCategory: 'general',
                isPerishable: false,
                ivaApplicable: true,
                isActive: true
            });
            await product.save();
        }

        // 2. Find a Waiter to assign
        let meseroRole = await roleModel.findOne({ name: 'Mesero', tenantId }).lean() as any;
        if (!meseroRole) {
            meseroRole = await roleModel.findOne({
                tenantId,
                $or: [{ name: /waiter/i }, { name: /mesero/i }]
            }).lean() as any;
        }

        if (!meseroRole) {
            throw new Error('Mesero role not found (run seed first)');
        }

        const waiter = await userModel.findOne({ tenantId, role: meseroRole._id }).exec();
        if (!waiter) {
            throw new Error('No waiter found available for this role.');
        }

        // 3. Create Order
        const userContext = {
            id: adminUser._id,
            tenantId: adminUser.tenantId,
            role: adminUser.role
        };

        const orderDto = {
            customerName: 'Cliente Propinas Test',
            customerRif: 'V12345678',
            items: [{
                productId: product._id.toString(),
                quantity: 2,
                unitPrice: 10
            }],
            channel: 'in_person',
            type: 'retail'
        };

        let order = await ordersService.create(orderDto as any, userContext);

        // Assign waiter using updateOne
        await orderModel.updateOne({ _id: order._id }, { assignedWaiterId: waiter._id });
        // Reload order to be sure
        order = await orderModel.findById(order._id).exec() as any;

        // 4. Register Tips
        const tipAmount = 5.00;
        // this returns the updated order document usually
        order = await tipsService.registerTipsOnOrder(
            order._id.toString(),
            { amount: tipAmount, method: 'cash' },
            tenantIdStr
        ) as any;

        // 5. Pay and Complete Order
        // Update using model
        await orderModel.updateOne({ _id: order._id }, {
            status: 'completed',
            paymentStatus: 'paid'
        });

        // 6. Distribute Tips
        const activeRule = await tipsService.findActiveDistributionRule(tenantIdStr);
        if (!activeRule) {
            await tipsService.createDistributionRule({
                name: 'Default Equal Rule',
                type: 'equal',
                isActive: true,
                rules: {
                    includedRoles: ['Mesero'],
                    poolTips: true
                } as any
            }, tenantIdStr);
        }

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const distributionResult = await tipsService.distributeTips(
            {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                distributionRuleId: (activeRule || await tipsService.findActiveDistributionRule(tenantIdStr))._id.toString()
            },
            tenantIdStr
        );

        // 7. Verification
        const success = distributionResult.totalTips >= tipAmount;

        // Check specific employee report
        const report = await tipsService.getTipsReportForEmployee(
            waiter._id.toString(),
            startDate,
            endDate,
            tenantIdStr
        );

        const resultMsg = `
    Simulation Result: ${success ? 'SUCCESS' : 'FAILURE'}
    Total Tips Distributed: ${distributionResult.totalTips}
    Tip Amount Expected: ${tipAmount}
    Employee Report (${waiter.firstName}): ${report.totalTips}
    `;

        fs.writeFileSync(resultFile, resultMsg);
        console.log(resultMsg);

    } catch (error) {
        logger.error('Simulation Failed', error);
        fs.writeFileSync(resultFile, `Simulation Failed: ${error.message}`);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
