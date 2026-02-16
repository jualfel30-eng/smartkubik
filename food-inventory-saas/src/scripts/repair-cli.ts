import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CashRegisterService } from '../modules/cash-register/cash-register.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('RepairCLI');
    try {
        const app = await NestFactory.createApplicationContext(AppModule);
        const service = app.get(CashRegisterService);

        // ID from logs: 68d371dffdb57e5c800f2fcd (Tenant Early Adopter Inc.)
        const tenantId = '68d371dffdb57e5c800f2fcd';

        logger.log(`Starting repair for tenant ${tenantId}...`);

        // Audit before repair
        const lastClosing = await service['closingModel'].findOne({ tenantId }).sort({ createdAt: -1 });
        if (lastClosing) {
            logger.log(`Auditing Closing: ${lastClosing.closingNumber}`);
            const session = await service['sessionModel'].findById(lastClosing.sessionId);
            logger.log(`Session Cash Movements: ${JSON.stringify(session?.cashMovements)}`);

            const orders = await service['orderModel'].find({ cashSessionId: lastClosing.sessionId }).limit(5).lean();
            logger.log(`Sample Orders Tax Data:`);
            orders.forEach(o => {
                logger.log(`Order ${o.orderNumber}: ivaTotal=${o.ivaTotal}, igtfTotal=${o.igtfTotal}, total=${o.totalAmount}`);
            });
        }

        const result = await service.repairLastClosing(tenantId);

        logger.log('Repair completed successfully!');
        logger.log(`Repaired Closing: ${result.closingNumber}`);
        logger.log(`Total Transactions: ${result.totalTransactions}`);
        logger.log(`Payment Summary: ${JSON.stringify(result.paymentMethodSummary)}`);

        await app.close();
        process.exit(0);
    } catch (error) {
        logger.error('Repair failed', error);
        process.exit(1);
    }
}

bootstrap();
