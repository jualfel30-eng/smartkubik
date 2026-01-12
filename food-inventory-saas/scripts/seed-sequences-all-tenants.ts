import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentSequence } from '../src/schemas/document-sequence.schema';
import { Tenant } from '../src/schemas/tenant.schema';
import { Model } from 'mongoose';

/**
 * Script para inyectar series de facturación a TODOS los tenants del sistema
 * Uso: npm run ts-node scripts/seed-sequences-all-tenants.ts
 */
async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const sequenceModel = app.get<Model<any>>(getModelToken(DocumentSequence.name));
    const tenantModel = app.get<Model<any>>(getModelToken(Tenant.name));

    console.log(`🚀 Iniciando inyección masiva de series de facturación...\n`);

    // Obtener todos los tenants
    const allTenants = await tenantModel.find({}).lean();
    console.log(`📊 Total de tenants encontrados: ${allTenants.length}\n`);

    if (allTenants.length === 0) {
        console.log('⚠️  No hay tenants en el sistema.');
        await app.close();
        return;
    }

    let tenantsProcessed = 0;
    let tenantsWithSequences = 0;
    let tenantsWithoutSequences = 0;
    let totalSequencesCreated = 0;
    let totalSequencesUpdated = 0;
    let totalSequencesSkipped = 0;

    for (const tenant of allTenants) {
        const tenantId = tenant._id.toString();
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📦 Procesando: ${tenant.name}`);
        console.log(`   ID: ${tenantId}`);

        // Verificar si ya tiene series
        const existingSequences = await sequenceModel.find({ tenantId }).lean();
        console.log(`   Series actuales: ${existingSequences.length}`);

        if (existingSequences.length > 0) {
            tenantsWithSequences++;
        } else {
            tenantsWithoutSequences++;
        }

        // Definir las series por defecto
        const defaultSequences = [
            {
                name: 'Factura Principal',
                type: 'invoice',
                prefix: 'F',
                currentNumber: 1,
                status: 'active',
                isDefault: true,
                scope: 'tenant',
                channel: 'digital',
                tenantId
            },
            {
                name: 'Nota de Crédito',
                type: 'credit_note',
                prefix: 'NC',
                currentNumber: 1,
                status: 'active',
                isDefault: true,
                scope: 'tenant',
                channel: 'digital',
                tenantId
            },
            {
                name: 'Nota de Débito',
                type: 'debit_note',
                prefix: 'ND',
                currentNumber: 1,
                status: 'active',
                isDefault: true,
                scope: 'tenant',
                channel: 'digital',
                tenantId
            },
            {
                name: 'Nota de Entrega',
                type: 'delivery_note',
                prefix: 'NE',
                currentNumber: 1,
                status: 'active',
                isDefault: true,
                scope: 'tenant',
                channel: 'digital',
                tenantId
            },
            {
                name: 'Cotización',
                type: 'quote',
                prefix: 'COT',
                currentNumber: 1,
                status: 'active',
                isDefault: true,
                scope: 'tenant',
                channel: 'digital',
                tenantId
            },
        ];

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const seq of defaultSequences) {
            // Verificar si ya existe esta serie para este tenant
            const exists = await sequenceModel.findOne({
                tenantId,
                type: seq.type,
                name: seq.name
            });

            if (!exists) {
                await sequenceModel.create(seq);
                console.log(`   ✅ Creada: ${seq.name} (${seq.prefix})`);
                created++;
                totalSequencesCreated++;
            } else {
                // Actualizar campos faltantes si la serie ya existe
                const updates: any = {};
                if (!exists.type) updates.type = seq.type;
                if (!exists.scope) updates.scope = seq.scope;
                if (!exists.channel) updates.channel = seq.channel;
                if (exists.isDefault === undefined) updates.isDefault = seq.isDefault;
                if (exists.status !== 'active') updates.status = 'active';

                if (Object.keys(updates).length > 0) {
                    await sequenceModel.updateOne({ _id: exists._id }, { $set: updates });
                    console.log(`   🔄 Actualizada: ${seq.name} (${Object.keys(updates).join(', ')})`);
                    updated++;
                    totalSequencesUpdated++;
                } else {
                    console.log(`   ⚠️  Ya existe: ${seq.name}`);
                    skipped++;
                    totalSequencesSkipped++;
                }
            }
        }

        console.log(`   📊 Resumen: ${created} creadas, ${updated} actualizadas, ${skipped} sin cambios`);
        tenantsProcessed++;
    }

    // Resumen final
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✨ PROCESO COMPLETADO\n`);
    console.log(`📊 ESTADÍSTICAS FINALES:`);
    console.log(`   - Tenants procesados: ${tenantsProcessed}/${allTenants.length}`);
    console.log(`   - Tenants que YA tenían series: ${tenantsWithSequences}`);
    console.log(`   - Tenants SIN series (nuevos): ${tenantsWithoutSequences}`);
    console.log(`   - Series creadas: ${totalSequencesCreated}`);
    console.log(`   - Series actualizadas: ${totalSequencesUpdated}`);
    console.log(`   - Series sin cambios: ${totalSequencesSkipped}`);
    console.log(`\n✅ Todos los tenants ahora tienen series de facturación!\n`);

    await app.close();
}

run().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
