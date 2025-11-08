
import { connect, disconnect, model } from 'mongoose';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { DeliveryRates, DeliveryRatesSchema, NationalShippingRate } from '../src/schemas/delivery-rates.schema';
import axios from 'axios';

const VENEZUELA_GEODATA_URL = 'https://raw.githubusercontent.com/zokeber/venezuela-json/master/venezuela.json';

async function seedDeliveryRates() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  const TenantModel = model(Tenant.name, TenantSchema);
  const DeliveryRatesModel = model(DeliveryRates.name, DeliveryRatesSchema);

  const tenant = await TenantModel.findOne({ code: 'EARLYADOPTER' });

  if (tenant) {
    console.log('Fetching Venezuela geodata...');
    const response = await axios.get(VENEZUELA_GEODATA_URL);
    const venezuelaData = response.data;

    const nationalShippingRates: NationalShippingRate[] = [];

    venezuelaData.forEach(stateData => {
      const stateName = stateData.estado;
      if (stateData.ciudades && stateData.ciudades.length > 0) {
        stateData.ciudades.forEach(cityData => {
          const cityName = typeof cityData === 'string' ? cityData : cityData.ciudad;
          nationalShippingRates.push({
            state: stateName,
            city: cityName,
            rate: 10, // Default rate, can be adjusted
            isActive: true,
          });
        });
      } else {
        // Add state with a placeholder city if no cities are listed
        nationalShippingRates.push({
          state: stateName,
          city: 'N/A', // Placeholder for states without listed cities
          rate: 10, // Default rate
          isActive: true,
        });
      }
    });

    await DeliveryRatesModel.findOneAndUpdate(
      { tenantId: tenant._id },
      {
        $set: {
          nationalShippingRates: nationalShippingRates,
        },
      },
      { upsert: true, new: true },
    );
    console.log('Delivery rates seeded successfully with comprehensive Venezuela data!');
  } else {
    console.log('Tenant with code EARLYADOPTER not found. Skipping delivery rates seeding.');
  }

  await disconnect();
}

seedDeliveryRates().catch(err => {
  console.error('Error seeding delivery rates:', err);
  process.exit(1);
});
