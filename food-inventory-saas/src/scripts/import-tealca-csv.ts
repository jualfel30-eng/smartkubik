
import { connect, model } from 'mongoose';
import { ShippingProvider, ShippingProviderSchema } from '../schemas/shipping-provider.schema';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const TEALCA_CSV_DATA = `
Codigo,Estado,Agencia_Nombre,Direccion_Referencia
2906,Anzoategui,Lecheria,Av. Principal de Lechería (Cerca de BBVA)
2907,Anzoategui,Barcelona,Av. Fuerzas Armadas (Cerca de Bomberos)
2909,Anzoategui,Puerto La Cruz,Av. Stadium CC Cardón
2912,Anzoategui,Anaco,Av. Portuguesa (Sector Chaparral)
2901,Anzoategui,El Tigre,3ra Carrera Sur (Pueblo Nuevo)
5113B,Aragua,Maracay Sector Santa Ana,Av. Constitución (Sector Santa Ana)
5115,Aragua,Cagua,Calle Sucre CC La Pirámide
5117,Aragua,La Morita,Av. Principal La Morita (CC Diga Center)
5118,Aragua,La Victoria,Calle Rivas Dávila
5119,Aragua,Maracay Oeste,Av. Universidad (El Limón)
5113,Aragua,Maracay Este (Av. Sucre),Av. Sucre (Urb. Calicanto)
8006,Barinas,Alto Barinas,Av. Andrés Eloy Blanco
8006B,Barinas,Barinas Centro Comercial,CC Cima (Av. Andrés Eloy Blanco)
8007,Barinas,Barinitas,Carrera 3 (Centro)
3205,Bolivar,Puerto Ordaz Castillito,Calle Santa Rosalía (Castillito)
3205B,Bolivar,Puerto Ordaz Alta Vista,CC Ciudad Alta Vista I
3207,Bolivar,Unare,Av. Paseo Caroní (Unare II)
3208,Bolivar,San Felix (El Roble),Av. Moreno de Mendoza (El Roble)
3208B,Bolivar,Upata,CC Colonial Park
3209,Bolivar,Ventuari,Av. Atlántico (CC Ventuari)
5208,Carabobo,Valencia (Zona Ind. Norte),Av. Ernesto Branger
5209,Carabobo,Naguanagua,Av. Universidad (Sector La Granja)
5210,Carabobo,San Diego,Av. Don Julio Centeno
5211,Carabobo,Tocuyito,Autopista Regional (Dist. La Encrucijada)
5214,Carabobo,Guacara,Calle Piar (Centro Guacara)
5201,Carabobo,Valencia (Av. A. Eloy Blanco),Av. Andrés Eloy Blanco (CC Shopping Center)
5206,Carabobo,Valencia Sur,Paseo Las Industrias
5207,Carabobo,Valencia (Dist. San Blas),Calle Negro Primero (Frente al Distribuidor)
5207B,Carabobo,Valencia (La Candelaria),CC Plaza Candelaria
5402,Cojedes,San Carlos,Av. Bolívar cruce con Calle Sucre
5403,Cojedes,Tinaquillo,Av. Miranda (Centro)
1137,Distrito Capital,El Rosal - Chacao,Av. Libertador Edif. EXA
1142,Distrito Capital,El Cafetal,CC Plaza Las Américas Nivel Oro
1141,Distrito Capital,Junquito,Km 11 Urb. 5 de Julio
1137B,Distrito Capital,CCCT,CC Ciudad Tamanaco Nivel C1
1127,Distrito Capital,Los Palos Grandes,4ta Avenida (Entre 2da y 3ra Transversal)
1128,Distrito Capital,La Candelaria,Av. Fuerzas Armadas (Esq. Socorro)
1128B,Distrito Capital,El Cementerio,Av. Principal (Mercado Merposur)
1128C,Distrito Capital,La Candelaria CC Lord Center,Av. Urdaneta CC Lord Center
1131,Distrito Capital,Los Caobos,Transversal Colón (Maripérez)
1133,Distrito Capital,Prados Del Este,CC La Pirámide (Concresa)
1102,Distrito Capital,Sabana Grande,Bulevar de Sabana Grande
1114,Distrito Capital,Boleita,Zona Industrial Boleíta Norte
1114B,Distrito Capital,Montecristo,Av. Rómulo Gallegos (Montecristo)
1114C,Distrito Capital,La California,Av. París (Edif. Premier)
1126,Distrito Capital,El Paraiso,Av. Páez (Frente al Multiplaza)
1125,Distrito Capital,Catia,Calle Maury (Cerca Plaza Sucre)
1119,Distrito Capital,San Martin,Av. José Ángel Lamas
1110,Distrito Capital,La Trinidad,Zona Industrial La Trinidad
3300,Delta Amacuro,Tucupita,Calle Pativilca
7607,Falcon,Coro,Av. Manaure (Edif. Don Antonio)
7607B,Falcon,Punto Fijo,Calle Zamora (Centro)
5501,Guarico,Calabozo,Calle 11 (Casco Central)
5303,Guarico,Valle De La Pascua,Calle Atarraya (Centro)
7918,Lara,Barquisimeto Oeste,Zona Industrial 1
7918B,Lara,Bqto Oeste Av. Las Industrias,Av. Las Industrias
7918C,Lara,Barquisimeto Carrera 19,Carrera 19 con Calle 25
7910,Lara,Barquisimeto Este,Av. Lara
7912,Lara,Barquisimeto Sur,Carrera 16 (Sector Colonial)
7916,Lara,Carora,Calle José Luis Andrade
7915,Lara,Cabudare,Av. Principal La Mata
8301B,Merida,Merida,Av. Las Américas (Sector Santa Bárbara)
8307,Merida,El Vigia,Av. Don Pepe Rojas
8204C,Merida,Caja Seca,Av. Panamericana
1302,Miranda,Guatire,Calle Ramón Alonzo Blanco (Pueblo Guatire)
1501,Miranda,Charallave,Av. Bolívar (Centro)
J1304,Miranda,Higuerote,Calle Comercio (Agente Aliado)
1405,Miranda,San Antonio De Los Altos,CC Los Castores
1305,Miranda,Guarenas,CC Guarenas Plaza
1405B,Miranda,Los Teques,Av. Pedro Russo Ferrer (El Tambor)
1132,Miranda,Filas De Mariches,Carretera Petare-Santa Lucía
J3008,Monagas,Temblador,Calle Bolívar (Agente Aliado)
J3009,Monagas,El Tejero / Punta De Mata,Carretera Nacional (Aliado)
3005,Monagas,Maturin Este (CC Juanico),CC Juanico Este
2706B,Nueva Esparta,Juan Griego,Av. Leandro
2706,Nueva Esparta,Porlamar,Calle San Rafael
2706C,Nueva Esparta,Cocheima,Av. 31 de Julio
7705,Portuguesa,Guanare,Av. Bolívar CC Giramara
5401B,Portuguesa,Acarigua,Calle 30 CC Páez
2802,Sucre,Cumana,Av. Perimetral
2803,Sucre,Carupano,Av. Independencia
J8132,Tachira,La Grita,Calle 2 (Aliado)
8112,Tachira,Paramillo,Zona Industrial Paramillo
8113,Tachira,La Fria,Carrera 4
8114,Tachira,San Cristobal Sur,La Concordia (Plaza Venezuela)
8115B,Tachira,Tariba,Carrera 4 (Centro)
8115,Tachira,San Cristobal,7ma Avenida (Centro)
8115C,Tachira,Capacho,Carrera 5 (Sector Villa Vista)
8107,Tachira,Ureña,Zona Industrial
8111,Tachira,San Cristobal (Barrio Obrero),Carrera 16
8204,Trujillo,Valera,Av. Bolívar (Las Acacias)
8204B,Trujillo,Valera-Centro,CC Adriático (Av. 12)
J1231,La Guaira,La Guaira,Av. Soublette (Aliado)
J1232,La Guaira,Caribe,Urb. Caribe (Aliado)
7802,Yaracuy,San Felipe,Av. Libertador (Sector El Oasis)
8509B,Zulia,Maracaibo Sur (La Coromoto),Urb. La Coromoto
8511,Zulia,Dr. Portillo,Calle 78 Dr. Portillo
8502B,Zulia,Delicias 5 De Julio,Av. 15 Delicias con Calle 77
8509,Zulia,Maracaibo Sur (San Francisco),Calle 18 (Sierra Maestra)
8513,Zulia,Maracaibo Oeste - La Limpia,Calle 79 (Sector La Limpia)
8514,Zulia,Maracaibo Norte,CC Doral Center (Av. Fuerzas Armadas)
8513B,Zulia,Maracaibo Circunvalacion 2,Circunvalación 2 (Sector San Miguel)
8511B,Zulia,Maracaibo Centro CC Gran Bazar,CC Gran Bazar (Casco Central)
8513C,Zulia,Maracaibo Delicias Norte,CC El Pilar
8405,Zulia,Cabimas,Av. Intercomunal
8406,Zulia,Ciudad Ojeda,Av. Intercomunal
8502,Zulia,Bella Vista 5 De Julio,Calle 77 (5 de Julio)
`;

async function bootstrap() {
    console.log('--- Starting Tealca Data Import ---');

    try {
        await connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const providerModel = model(ShippingProvider.name, ShippingProviderSchema);

        // 1. Parse CSV
        const lines = TEALCA_CSV_DATA.trim().split('\n').filter(l => l.trim().length > 0).slice(1);
        console.log(`Parsing ${lines.length} lines from CSV...`);

        const stateMap = new Map<string, any>();
        let agencyCount = 0;

        for (const line of lines) {
            const [code, state, name, address] = line.split(',');

            if (!code || !state) continue;

            const trimmedState = state.trim();
            const trimmedName = name.trim();
            const trimmedAddress = address.trim();
            const trimmedCode = code.trim();

            if (!stateMap.has(trimmedState)) {
                stateMap.set(trimmedState, { cities: new Map() });
            }

            // Same logic as MRW, Name acts as City & Agency
            const cityKey = trimmedName;

            stateMap.get(trimmedState).cities.set(cityKey, {
                code: trimmedCode,
                name: trimmedName,
                agencies: [{
                    name: trimmedName,
                    code: trimmedCode,
                    address: trimmedAddress,
                    phone: ''
                }]
            });
            agencyCount++;
        }

        // 2. Construct DB Document
        const regions: any[] = [];
        for (const [state, stateData] of stateMap) {
            const citiesList: any[] = [];
            for (const [cityName, cityData] of stateData.cities) {
                citiesList.push({
                    name: cityName,
                    code: String(cityData.code),
                    agencies: cityData.agencies
                });
            }

            if (citiesList.length > 0) {
                regions.push({
                    state: state,
                    cities: citiesList
                });
            }
        }

        // 3. Update Database
        console.log(`Updating ShippingProvider 'Tealca'... with ${regions.length} regions and ${agencyCount} agencies.`);

        await providerModel.findOneAndUpdate(
            { name: 'Tealca' },
            {
                name: 'Tealca',
                code: 'TEALCA-VE',
                regions: regions,
                isActive: true,
                logoUrl: '/shipping-providers/tealca.svg'
            },
            { upsert: true, new: true }
        );

        console.log('Import Complete!');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        process.exit(0);
    }
}

bootstrap();
