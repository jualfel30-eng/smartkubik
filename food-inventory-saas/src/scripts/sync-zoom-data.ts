
import { connect, model } from 'mongoose';
import { ShippingProvider, ShippingProviderSchema } from '../schemas/shipping-provider.schema';
import axios from 'axios';

// API CONSTANTS
const BASE_URL = 'https://sandbox.zoom.red/baaszoom/public/canguroazul';
const MONGO_URI = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function bootstrap() {
    console.log('--- Starting Zoom Data Sync (Standalone) ---');

    try {
        await connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const providerModel = model(ShippingProvider.name, ShippingProviderSchema);

        // 1. Fetch Cities (Global List)
        console.log('Fetching Cities...');
        const citiesRes = await axios.get(`${BASE_URL}/getCiudades`);
        const allCities = citiesRes.data.entidadRespuesta;

        if (!allCities || !Array.isArray(allCities)) {
            throw new Error('Failed to fetch cities');
        }

        console.log(`Found ${allCities.length} cities.`);

        // 2. Group by State
        const stateMap = new Map<string, any>();

        for (const cityData of allCities) {
            const stateName = cityData.nombre_estado;
            const cityName = cityData.nombre_ciudad;
            const cityCode = cityData.codciudad;

            if (!stateMap.has(stateName)) {
                stateMap.set(stateName, { cities: new Map() });
            }

            stateMap.get(stateName).cities.set(cityName, {
                code: cityCode,
                name: cityName,
                agencies: []
            });
        }

        // 3. Fetch Agencies per City
        console.log('Fetching Agencies for each city...');
        let processedCities = 0;

        for (const [state, stateData] of stateMap) {
            for (const [cityName, cityData] of stateData.cities) {
                try {
                    // Delay to be nice
                    await new Promise(r => setTimeout(r, 50));

                    const officeRes = await axios.get(`${BASE_URL}/getOficinas?codciudad=${cityData.code}&codservicio=0`);

                    if (officeRes.data.codrespuesta === 'COD_000' && Array.isArray(officeRes.data.entidadRespuesta)) {
                        const offices = officeRes.data.entidadRespuesta.map(o => ({
                            name: o.nombre,
                            code: String(o.codoficina),
                            address: o.nombre, // Fallback
                            phone: ''
                        }));
                        cityData.agencies = offices;
                        process.stdout.write('+');
                    } else {
                        process.stdout.write('-');
                    }
                } catch (err) {
                    process.stdout.write('x');
                }
                processedCities++;
            }
        }
        console.log('\nData gathering complete. Constructing Document...');

        // 4. Construct DB Document
        const regions: any[] = [];
        for (const [state, stateData] of stateMap) {
            const citiesList: any[] = [];
            for (const [cityName, cityData] of stateData.cities) {
                if (cityData.agencies.length > 0) {
                    citiesList.push({
                        name: cityName,
                        code: String(cityData.code),
                        agencies: cityData.agencies
                    });
                }
            }

            if (citiesList.length > 0) {
                regions.push({
                    state: state,
                    cities: citiesList
                });
            }
        }

        // 5. Update Database
        console.log(`Updating ShippingProvider 'Grupo Zoom'... with ${regions.length} regions.`);

        await providerModel.findOneAndUpdate(
            { name: 'Grupo Zoom' },
            {
                name: 'Grupo Zoom',
                code: 'ZOOM-VE',
                regions: regions,
                isActive: true,
                logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Grupo_ZOOM_logo.png'
            },
            { upsert: true, new: true }
        );

        console.log('Sync Complete!');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        process.exit(0);
    }
}

bootstrap();
