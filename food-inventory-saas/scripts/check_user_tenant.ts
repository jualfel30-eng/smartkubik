s
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/schemas/user.schema';
import { Tenant } from '../src/schemas/tenant.schema';
import { DocumentSequence } from '../src/schemas/document-sequence.schema';
import { Model } from 'mongoose';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get<Model<any>>(getModelToken(User.name));
    const tenantModel = app.get<Model<any>>(getModelToken(Tenant.name));
    const sequenceModel = app.get<Model<any>>(getModelToken(DocumentSequence.name));

    const email = 'admin@earlyadopter.com';
    const user = await userModel.findOne({ email });

    if (!user) {
        console.log(`User ${email} not found.`);
    } else {
        console.log(`User ${email} found.`);
        console.log(`- Tenant ID: ${user.tenantId}`);

        const tenant = await tenantModel.findById(user.tenantId);
        console.log(`- Tenant Name: ${tenant?.name || 'Unknown'}`);

        const sequences = await sequenceModel.find({ tenantId: user.tenantId }).lean();
        console.log(`- Sequences for this tenant: ${sequences.length}`);
        sequences.forEach(s => {
            console.log(`  > ${s.name} (${s.type || 'no-type'}) - Status: ${s.status}, Default: ${s.isDefault}`);
        });
    }

    // Check if there are other tenants
    const allTenants = await tenantModel.find({}).countDocuments();
    console.log(`Total tenants in DB: ${allTenants}`);

    // Check specific seeded tenant from Logs
    // (I don't have the ID from logs, but I saw '68d371dffdb57e5c800f2fcd' in previous output)
    const seedId = '68d371dffdb57e5c800f2fcd';
    console.log(`Checking seeded ID from previous logs: ${seedId}`);
    const seedSequences = await sequenceModel.find({ tenantId: seedId }).lean();
    console.log(`- Sequences for seeded tenant: ${seedSequences.length}`);

    await app.close();
}

run();
