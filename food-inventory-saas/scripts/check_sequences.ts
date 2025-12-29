
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentSequence } from '../src/schemas/document-sequence.schema';
import { Model } from 'mongoose';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const sequenceModel = app.get<Model<any>>(getModelToken(DocumentSequence.name));

    console.log('--- CHECKING DOCUMENT SEQUENCES ---');
    const sequences = await sequenceModel.find({}).lean();
    console.log(`Found ${sequences.length} sequences.`);

    sequences.forEach(s => {
        console.log(`- ID: ${s._id}`);
        console.log(`  Name: ${s.name}`);
        console.log(`  Type: ${s.type}`);
        console.log(`  Prefix: ${s.prefix}`);
        console.log(`  Active: ${s.isActive}`);
        console.log(`  Default: ${s.isDefault}`);
        console.log(`  Tenant: ${s.tenantId}`);
        console.log('---');
    });

    await app.close();
}

run();
