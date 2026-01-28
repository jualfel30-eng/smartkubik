
import { connect, model } from 'mongoose';
import { ShippingProvider, ShippingProviderSchema } from '../schemas/shipping-provider.schema';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const LIBERTY_CSV_DATA = `
Codigo,Estado,Ciudad,Agencia_Nombre,Direccion_Referencia
BARCELONA LAS GARZAS,Anzoategui,Barcelona,Barcelona Las Garzas,Av. Jorge Rodríguez C.C Sal Bahía Local 6
EL TIGRE,Anzoategui,El Tigre,El Tigre,CC Madrid Local PB-07 (Cruce con carrera 14 Sur)
ANACO,Anzoategui,Anaco,Anaco,Av. José Antonio Anzoátegui CC Anaco Center PB Local 35-A
SAN FERNANDO DE APURE,Apure,San Fernando,San Fernando De Apure,Calle 24 de Julio Edif. Al Zarouni PB Local 2
MARACAY SUR,Aragua,Maracay,Maracay Sur,Av. Aragua Local 194 (Sector Andrés Eloy Blanco)
MARACAY LAS DELICIAS,Aragua,Maracay,Maracay Las Delicias,CC Paseo Las Delicias 2 PB Local 17
CAGUA,Aragua,Cagua,Cagua,Calle Comercio Sur (Entre Bolívar y San Juan)
MARACAY,Aragua,Maracay,Maracay Centro,Calle López Aveledo (Residencias Asimar)
BARINAS,Barinas,Barinas,Barinas,Av. Sucre Edif. Mi Castillo PB Local 15-179
CIUDAD BOLIVAR,Bolivar,Ciudad Bolivar,Ciudad Bolivar,Av. Rotaria Edif. Los Martínez (Vista Hermosa)
PUERTO ORDAZ,Bolivar,Puerto Ordaz,Puerto Ordaz,Zona Ind. Unare II Calle Ipire Edif. Ori PB
VALENCIA CC METROSUR,Carabobo,Valencia,Valencia Metrosur,Av. 73 Humberto Celli (Frente a UNEFA La Isabelica)
VALENCIA NORTE,Carabobo,Valencia,Valencia Norte,Av. Andrés Eloy Blanco CC Residencias Luigia Local 8
VALENCIA CENTRO,Carabobo,Valencia,Valencia Centro,CC Guaparo Redoma de Guaparo PB
SAN CARLOS,Cojedes,San Carlos,San Carlos,Av. Bolívar CC Galería Moderna PB
CORO,Falcon,Coro,Coro,Calle Libertad Sector Cabudare II
PUNTO FIJO,Falcon,Punto Fijo,Punto Fijo,Av. Jacinto Lara Edif. Los Olivares II PB
C.C.C.T,Miranda,Caracas,C.C.C.T.,CCCT Nivel PB Local 10-22 (Chuao)
ALTOS MIRANDINOS,Miranda,Los Teques,Altos Mirandinos,CC La Colina Piso 3 Local N6 (San Antonio)
GUATIRE,Miranda,Guatire,Guatire,Calle 9 de Diciembre CC Center Plaza Nivel Avenida
CHARALLAVE,Miranda,Charallave,Charallave,Unicentro Santa Ana Piso 1 (Final Av. Tosta García)
LA BOYERA,Miranda,Caracas,La Boyera,Av. Ppal El Hatillo CC Los Geranios Nivel 2
ALTAMIRA PLAZA,Miranda,Caracas,Altamira Plaza,Av. Luis Roche Edif. Univers PB Local E
PANTEON,Distrito Capital,Caracas,Panteon,Final Av. Panteón Edif. Building Rodal Local 1
BELLO MONTE,Distrito Capital,Caracas,Bello Monte,Calle Sorbona Edif. Saturno (Colinas de Bello Monte)
LA URBINA,Distrito Capital,Caracas,La Urbina,Calle 9 Edif. 07 PB (Al lado de Polimiranda)
SANTA PAULA,Miranda,Caracas,Santa Paula,CC Vizcaya PB (El Cafetal)
EL PARAISO,Distrito Capital,Caracas,El Paraiso,Av. Díaz Sánchez Qta. Canadá Local 3 (El Pinar)
EL ROSAL,Miranda,Caracas,El Rosal,Av. Venezuela Edif. Venezuela PB Local 2
EL ROSAL VIP,Miranda,Caracas,El Rosal VIP,Av. Venezuela Edif. Venezuela PB Local 1
SAN JUAN DE LOS MORROS,Guarico,San Juan De Los Morros,San Juan De Los Morros,Av. Miranda CC Bonanza Local 5/6
CALABOZO,Guarico,Calabozo,Calabozo,Av. Antonio José de Sucre Edif. Fátima Local 2
VALLE DE LA PASCUA,Guarico,Valle De La Pascua,Valle De La Pascua,Calle Atarraya Edif. Jesús y María PB
BARQUISIMETO,Lara,Barquisimeto,Barquisimeto,Carrera 21 entre calles 8 y 9
BARQUISIMETO OESTE,Lara,Barquisimeto,Barquisimeto Oeste,Av. Pedro León Torres CC Canaima Local L19
CABUDARE,Lara,Cabudare,Cabudare,Av. Intercomunal Sector La Mora CC Villas Park
MATURIN,Monagas,Maturin,Maturin,Av. Juncal Local 43-B
EL VIGIA,Merida,El Vigia,El Vigia,Sector La Inmaculada Calle 9
MERIDA SUR,Merida,Merida,Merida Sur,Av. Andrés Bello CC Milenium PB Local 21
MERIDA,Merida,Merida,Merida,Av. Las Américas CC Plaza Mayor Local LF32
PAMPATAR (MANEIRO),Nueva Esparta,Pampatar,Pampatar Maneiro,CC Rattan Plaza Etapa II PB Edif 2
GUANARE,Portuguesa,Guanare,Guanare,Carrera 08 Esq. Calle 15 Centro Empresarial V&C
ACARIGUA,Portuguesa,Acarigua,Acarigua,Av. Las Lágrimas CC Rupica PB Local 03
CARUPANO,Sucre,Carupano,Carupano,Calle Juncal Edif. JL Locales 2 y 3
CUMANA,Sucre,Cumana,Cumana,Av. Gran Mariscal CC La Paz Local 5
TRUJILLO,Trujillo,Trujillo,Trujillo,Av. Mendoza CC Don Pedro PB Local 8
VALERA,Trujillo,Valera,Valera,Av. Bolívar CC Invoca PB Local 6
SAN CRISTOBAL,Tachira,San Cristobal,San Cristobal,Av. Libertador (Antiguo Casa Pueblo)
SAN CRISTOBAL BARRIO OBRERO,Tachira,San Cristobal,San Cristobal Barrio Obrero,Calle 11 Edif. Italia PB (Barrio Obrero)
SAN ANTONIO DEL TACHIRA,Tachira,San Antonio,San Antonio Del Tachira,Carrera 8 Nro 5-25 (Centro)
SAN FELIPE,Yaracuy,San Felipe,San Felipe,Av. 8 c/c Calle 11 Local Dentovip
MARACAIBO,Zulia,Maracaibo,Maracaibo,Av. 5 de Julio Edif. Varghel PB Local 2
MARACAIBO NORTE,Zulia,Maracaibo,Maracaibo Norte,Av. 15 Delicias CC Bulevar Delicias Norte
CABIMAS,Zulia,Cabimas,Cabimas,Av. Ppal Casco Central CC La Fuente Local 38
`;

async function bootstrap() {
    console.log('--- Starting Liberty Express Data Import ---');

    try {
        await connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const providerModel = model(ShippingProvider.name, ShippingProviderSchema);

        // 1. Parse CSV
        const lines = LIBERTY_CSV_DATA.trim().split('\n').filter(l => l.trim().length > 0).slice(1);
        console.log(`Parsing ${lines.length} lines from CSV...`);

        const stateMap = new Map<string, any>();
        let agencyCount = 0;

        for (const line of lines) {
            const [code, state, city, name, address] = line.split(',');

            if (!code || !state) continue;

            const trimmedState = state.trim();
            const trimmedCity = city ? city.trim() : name.trim();
            const trimmedName = name.trim();
            const trimmedAddress = address ? address.trim() : '';
            const trimmedCode = code.trim();

            if (!stateMap.has(trimmedState)) {
                stateMap.set(trimmedState, { cities: new Map() });
            }

            if (!stateMap.get(trimmedState).cities.has(trimmedCity)) {
                stateMap.get(trimmedState).cities.set(trimmedCity, {
                    code: trimmedCode, // Use first agency code as city code proxy
                    name: trimmedCity,
                    agencies: []
                });
            }

            stateMap.get(trimmedState).cities.get(trimmedCity).agencies.push({
                name: trimmedName,
                code: trimmedCode,
                address: trimmedAddress,
                phone: ''
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
                    code: String(cityData.code), // Using first agency code as city code
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
        console.log(`Updating ShippingProvider 'Liberty Express'... with ${regions.length} regions and ${agencyCount} agencies.`);

        await providerModel.findOneAndUpdate(
            { name: 'Liberty Express' },
            {
                name: 'Liberty Express',
                code: 'LIBERTY-VE',
                regions: regions,
                isActive: true,
                logoUrl: '/shipping-providers/liberty.svg'
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
