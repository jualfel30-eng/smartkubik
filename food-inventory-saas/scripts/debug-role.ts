import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Role } from '../src/schemas/role.schema';

async function debugRole() {
  const roleId = process.argv[2];
  if (!roleId) {
    console.error('❌ Please provide a roleId as an argument.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const roleModel = app.get<Model<Role>>(getModelToken(Role.name));

  console.log(`--- Searching for role with ID: ${roleId} ---`);
  
  const role = await roleModel.findById(new mongoose.Types.ObjectId(roleId)).exec();

  if (role) {
    console.log('--- ROLE FOUND ---\n');
    console.log(JSON.stringify(role.toObject(), null, 2));
  } else {
    console.log('--- ROLE NOT FOUND ---\n');
  }

  await app.close();
}

debugRole().catch(err => {
  console.error('Error running debug script:', err);
  process.exit(1);
});
