import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentSequence } from '../src/schemas/document-sequence.schema';
import { Tenant } from '../src/schemas/tenant.schema';
import { Model } from 'mongoose';

/**
 * Script para inyectar series de facturación a un tenant específico por nombre
 * Uso: npm run ts-node scripts/seed-sequences-by-tenant-name.ts "Tiendas Broas"
 */
async function run() {
    const tenantName = process.argv[2];

    if (!tenantName) {
        console.error('❌ Error: Debes proporcionar el nombre del tenant');
        console.log('Uso: npm run ts-node scripts/seed-sequences-by-tenant-name.ts "Nombre del Tenant"');
        process.exit(1);
    }

    const app = await NestFactory.createApplicationContext(AppModule);
    const sequenceModel = app.get<Model<any>>(getModelToken(DocumentSequence.name));
    const tenantModel = app.get<Model<any>>(getModelToken(Tenant.name));

    console.log(`🔍 Buscando tenant: "${tenantName}"...`);

    // Buscar tenant por nombre (case-insensitive)
    const tenant = await tenantModel.findOne({
        name: { $regex: new RegExp(`^${tenantName}$`, 'i') }
    });

    if (!tenant) {
        console.error(`❌ No se encontró el tenant: "${tenantName}"`);
        console.log('\n📋 Tenants disponibles:');
        const allTenants = await tenantModel.find({}, { name: 1 }).lean();
        allTenants.forEach(t => console.log(`  - ${t.name}`));
        await app.close();
        process.exit(1);
    }

    const tenantId = tenant._id.toString();
    console.log(`✅ Tenant encontrado: ${tenant.name}`);
    console.log(`   ID: ${tenantId}`);

    // Definir las series por defecto (igual que en Earlyadopter)
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

    console.log(`\n📝 Inyectando series de facturación...`);

    for (const seq of defaultSequences) {
        // Verificar si ya existe esta serie para este tenant
        const exists = await sequenceModel.findOne({
            tenantId,
            type: seq.type,
            name: seq.name
        });

        if (!exists) {
            await sequenceModel.create(seq);
            console.log(`  ✅ Creada: ${seq.name} (${seq.prefix})`);
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
                console.log(`  🔄 Actualizada: ${seq.name} (campos: ${Object.keys(updates).join(', ')})`);
            } else {
                console.log(`  ⚠️  Ya existe: ${seq.name}`);
            }
        }
    }

    // Verificar resultado final
    console.log(`\n🔍 Verificando series creadas...`);
    const finalSequences = await sequenceModel.find({ tenantId }).lean();
    console.log(`✅ Total de series para "${tenant.name}": ${finalSequences.length}`);

    finalSequences.forEach(s => {
        console.log(`  - ${s.name} (${s.type}) - ${s.prefix}${s.currentNumber} - Status: ${s.status}`);
    });

    console.log(`\n✨ Proceso completado exitosamente!`);
    await app.close();
}

run().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
