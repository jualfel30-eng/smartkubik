
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentSequence } from '../src/schemas/document-sequence.schema';
import { Tenant } from '../src/schemas/tenant.schema';
import { Model } from 'mongoose';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const sequenceModel = app.get<Model<any>>(getModelToken(DocumentSequence.name));
    const tenantModel = app.get<Model<any>>(getModelToken(Tenant.name));

    const tenant = await tenantModel.findOne({});
    if (!tenant) {
        console.error('No tenant found!');
        process.exit(1);
    }
    const tenantId = tenant._id.toString();
    console.log(`Seeding sequences for tenant: ${tenantId}`);

    const defaults = [
        { name: 'Factura Principal', type: 'invoice', prefix: 'F', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
        { name: 'Nota de Crédito', type: 'credit_note', prefix: 'NC', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
        { name: 'Nota de Débito', type: 'debit_note', prefix: 'ND', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
        { name: 'Nota de Entrega', type: 'delivery_note', prefix: 'NE', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
    ];

    for (const seq of defaults) {
        const exists = await sequenceModel.findOne({ tenantId, type: seq.type });
        if (!exists) {
            await sequenceModel.create(seq);
            console.log(`Created sequence: ${seq.name}`);
        } else {
            // Update existing to have new fields if missing
            const updates: any = {};
            if (!exists.type) updates.type = seq.type;
            if (!exists.scope) updates.scope = seq.scope;
            if (exists.isDefault === undefined) updates.isDefault = seq.isDefault;

            if (Object.keys(updates).length > 0) {
                await sequenceModel.updateOne({ _id: exists._id }, { $set: updates });
                console.log(`Updated sequence: ${seq.name}`);
            } else {
                console.log(`Sequence exists: ${seq.name}`);
            }
        }
    }

    console.log('Done.');
    await app.close();
}

run();
