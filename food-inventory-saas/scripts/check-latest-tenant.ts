import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

async function checkLatestTenant() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to database');

    const db = client.db('test');

    // Get latest tenant
    const tenant = await db.collection('tenants').findOne({}, { sort: { createdAt: -1 } });

    if (!tenant) {
      console.log('No tenants found');
      return;
    }

    console.log('\n=== LATEST TENANT ===');
    console.log('Business Name:', tenant.businessName);
    console.log('Email:', tenant.email);
    console.log('Vertical:', tenant.vertical);
    console.log('Business Type:', tenant.businessType);
    console.log('Vertical Profile Key:', tenant.verticalProfile?.key);
    console.log('Subscription Plan:', tenant.subscriptionPlan);
    console.log('Created At:', tenant.createdAt);
    console.log('Is Confirmed:', tenant.isConfirmed);
    console.log('Confirmation Code:', tenant.confirmationCode);

    console.log('\n=== ENABLED MODULES ===');
    if (tenant.enabledModules && typeof tenant.enabledModules === 'object') {
      const enabledList = Object.keys(tenant.enabledModules).filter(
        key => tenant.enabledModules[key] === true
      );
      if (enabledList.length > 0) {
        enabledList.forEach((mod: string) => console.log('-', mod));
        console.log('\nTotal modules:', enabledList.length);
      } else {
        console.log('❌ No modules enabled!');
      }
    } else {
      console.log('❌ enabledModules field is not an object!');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkLatestTenant();
