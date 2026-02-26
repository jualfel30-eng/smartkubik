/**
 * MIGRATION: Seed default billing sequences for all tenants that don't have any.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-billing-series.script.ts
 *
 * Safe to run multiple times — idempotent per tenant.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    console.log('🚀 Starting billing series migration...\n');
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    const tenantModel = app.get<Model<any>>(getModelToken('Tenant'));
    const sequenceModel = app.get<Model<any>>(getModelToken('DocumentSequence'));

    const tenants = await tenantModel
        .find({ status: 'active' })
        .select('_id name')
        .lean();

    console.log(`📋 Found ${tenants.length} active tenants to check.\n`);

    const stats = {
        total: tenants.length,
        alreadyHad: 0,
        created: 0,
        errors: 0,
    };

    const DEFAULTS = [
        { name: 'Factura Principal', type: 'invoice', prefix: 'F', isDefault: true },
        { name: 'Nota de Crédito', type: 'credit_note', prefix: 'NC', isDefault: true },
        { name: 'Nota de Débito', type: 'debit_note', prefix: 'ND', isDefault: true },
        { name: 'Nota de Entrega', type: 'delivery_note', prefix: 'NE', isDefault: true },
    ];

    for (const tenant of tenants) {
        const tenantId = String(tenant._id);

        try {
            const existingCount = await sequenceModel.countDocuments({ tenantId });

            if (existingCount > 0) {
                console.log(`  ✅ ${tenant.name} (${tenantId}) — ya tiene ${existingCount} serie(s). Saltando.`);
                stats.alreadyHad++;
                continue;
            }

            // Create the 4 default sequences
            let createdForTenant = 0;
            for (const def of DEFAULTS) {
                const alreadyExists = await sequenceModel.findOne({ tenantId, type: def.type });
                if (!alreadyExists) {
                    await sequenceModel.create({
                        name: def.name,
                        type: def.type,
                        prefix: def.prefix,
                        currentNumber: 1,
                        status: 'active',
                        scope: 'tenant',
                        channel: 'digital',
                        isDefault: def.isDefault,
                        tenantId,
                    });
                    createdForTenant++;
                }
            }

            console.log(`  🆕 ${tenant.name} (${tenantId}) — creadas ${createdForTenant} serie(s).`);
            stats.created += createdForTenant;

        } catch (err) {
            console.error(`  ❌ ${tenant.name} (${tenantId}) — ERROR: ${err.message}`);
            stats.errors++;
        }
    }

    console.log('\n══════════════════════════════════════════');
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('══════════════════════════════════════════');
    console.log(`  Tenants revisados:     ${stats.total}`);
    console.log(`  Ya tenían series:      ${stats.alreadyHad}`);
    console.log(`  Series creadas:        ${stats.created}`);
    console.log(`  Errores:               ${stats.errors}`);
    console.log('══════════════════════════════════════════\n');

    await app.close();
    process.exit(stats.errors > 0 ? 1 : 0);
}

bootstrap().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
