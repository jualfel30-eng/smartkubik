
import { connect, model } from 'mongoose';
import { ShippingProvider, ShippingProviderSchema } from '../schemas/shipping-provider.schema';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const MRW_CSV_DATA = `
Codigo,Estado,Agencia_Nombre,Direccion_Referencia
0101000,Distrito Capital,Los Caobos,Av. Panamá con Av. Libertador
0102000,Distrito Capital,Bello Monte,Av. Miguelangel Edif. Oberon
0103000,Distrito Capital,El Llanito,Av. Tamanaco (Sector El Llanito)
0103100,Distrito Capital,Plaza Las Americas,CC Plaza Las Américas Nivel Oro
0104000,Distrito Capital,Centro,Esq. Sociedad a Gradillas (Av. Universidad)
0105000,Distrito Capital,Chacao El Muñeco,Calle El Muñeco (Chacao)
0106000,Distrito Capital,Chuao,CCCT Nivel PB (Chuao)
0107000,Distrito Capital,El Paraiso,Av. Páez CC Multiplaza Paraíso
0107100,Distrito Capital,Parque Naciones Unidas,Av. La Paz (Frente al Parque)
0108000,Distrito Capital,Plaza Estrella,San Bernardino Plaza Estrella
0109000,Distrito Capital,Campo Claro,Av. Francisco de Miranda (Dos Caminos)
0110000,Distrito Capital,La Trinidad,Zona Industrial La Trinidad
0111000,Distrito Capital,Los Chaguaramos,Av. Las Ciencias
0113000,Distrito Capital,Lebrun Petare,Av. Francisco de Miranda (Calle Lebrun)
0113200,Distrito Capital,Palo Verde,CC Palo Verde Nivel Plaza
0114000,Distrito Capital,Sabana Grande,Bulevar de Sabana Grande
0115000,Distrito Capital,Altamira,Av. San Juan Bosco
0116000,Distrito Capital,Los Chorros,Av. Principal de Los Chorros
0117000,Distrito Capital,Baruta,Pueblo de Baruta
0118000,Distrito Capital,La Piramide,CC La Pirámide (Prados del Este)
0119000,Distrito Capital,Las Acacias,Av. Gral Medina Angarita
0120000,Distrito Capital,La Urbina,Calle 4 (Zona Industrial)
0121000,Distrito Capital,Santa Fe,Centro Comercial Santa Fe
0122000,Distrito Capital,Los Rosales,Av. Nueva Granada
0123000,Distrito Capital,Las Mercedes,Calle Madrid (Las Mercedes)
0124000,Distrito Capital,Santa Sofia,CC Santa Sofía (El Cafetal)
0125000,Distrito Capital,El Hatillo,Pueblo de El Hatillo
0126000,Distrito Capital,El Cementerio,Av. Principal (Sector Peaje)
0127000,Distrito Capital,Boleita,Zona Industrial Boleíta Norte
0128000,Distrito Capital,Catia,Av. Sucre CC Oeste
0128100,Distrito Capital,Perez Bonalde,Bulevar de Catia
0129000,Distrito Capital,El Junquito,Km 18 Pueblo El Junquito
0130000,Distrito Capital,Santa Monica,Av. Teresa de la Parra
0131000,Distrito Capital,El Bosque,Av. Libertador (El Bosque)
0132000,Distrito Capital,Caricuao,UD3 CC Caricuao Plaza
0132100,Distrito Capital,Montalban,CC La Villa (Montalbán II)
0133000,Distrito Capital,La Florida,Av. Las Acacias
0134000,Distrito Capital,San Martin,Av. San Martín
0135000,Distrito Capital,Lecuna,Av. Lecuna (Cerca Parque Central)
0137000,Distrito Capital,Pantin,Calle Pantin (Chacao)
0138000,Distrito Capital,Las Minas,San Antonio de los Altos (Las Minas)
0139000,Distrito Capital,Quinta Crespo,Av. Baralt
0140000,Distrito Capital,La Candelaria,Esq. Candilito
0141000,Distrito Capital,Av. Casanova,Av. Casanova (El Rosal)
0142000,Distrito Capital,El Valle,Av. Intercomunal El Valle
0143000,Distrito Capital,Andres Bello,Av. Andrés Bello
0144000,Distrito Capital,Sebucan,Av. Principal Sebucán
0145000,Distrito Capital,Capitolio,Esq. Padre Sierra
0146000,Distrito Capital,Antimano/ La Yaguara,Av. Intercomunal de Antímano
0147000,Distrito Capital,La Castellana,Av. Principal La Castellana
0148000,Distrito Capital,Chacaito,Av. Francisco de Miranda
0149000,Distrito Capital,La California,Av. Francisco de Miranda
0150000,Distrito Capital,Los Palos Grandes,1ra Transversal
0200000,Amazonas,Puerto Ayacucho,Av. Orinoco Centro
0300000,Anzoategui,Barcelona,Av. Fuerzas Armadas
0301000,Anzoategui,Anaco,Av. Mérida
0302000,Anzoategui,El Tigre,Av. Francisco de Miranda
0303000,Anzoategui,Las Garzas,Av. Intercomunal
0307000,Anzoategui,El Tigrito,Guanipa
0308000,Anzoategui,Pariaguan,Calle Comercio
0309000,Anzoategui,Pto La Cruz,Av. Municipal
0310000,Anzoategui,Nueva Barcelona,CC Camino Real
0311000,Anzoategui,Clarines,Troncal 9
0312000,Anzoategui,Lecheria,Av. Principal Lechería
0313000,Anzoategui,El Tigre Centro,Calle Bolívar
0400000,Apure,San Fernando,Calle Diana
0401000,Apure,Guasdualito,Calle Bolívar
0402000,Apure,San Fernando Centro,Av. Carabobo
0500000,Aragua,Maracay Centro,Av. Bolívar
0501000,Aragua,Maracay Zona Ind.,Av. Antón Phillips
0503000,Aragua,La Victoria,Calle Rivas Dávila
0504000,Aragua,Maracay 5 De Julio,Urb. San José
0506000,Aragua,Turmero,Calle Mariño
0507000,Aragua,Villa De Cura,Av. Paradisi
0509000,Aragua,S.Sebastian D Los Reyes,Calle Bolívar
0510000,Aragua,Maracay La Democracia,Calle Junín
0511000,Aragua,Turmero Zona Industrial,Remavenca
0512000,Aragua,La Encrucijada,CC Regional
0513000,Aragua,Maracay Base Aragua,CC Hyper Jumbo
0516000,Aragua,Maracay Santa Rosa,Av. Ayacucho
0517000,Aragua,Maracay La Romana,Av. Principal
0518000,Aragua,Los Cedros,Av. Los Cedros
0511100,Aragua,Maracay Santa Rita,Santa Rita
0600000,Barinas,Barinas,Av. 23 de Enero
0600100,Barinas,Av Sucre Barinas,Av. Sucre
0601000,Barinas,Socopo,Carrera 10
0602000,Barinas,Barinas Zona Ind.,Av. Industrial
0603000,Barinas,Sta Barbara De Barinas,Calle 5
0604000,Barinas,Barinas Sabaneta,Av. Bolívar
0605000,Barinas,Alto Barinas,CC Doña Grazzia
0605100,Barinas,Forum,CC Forum
0606000,Barinas,Barinas 23 De Enero,Av. Cuatricentenaria
0700000,Bolivar,Ciudad Bolivar,Av. Táchira
0701000,Bolivar,Alta Vista,CC Zulia (Puerto Ordaz)
0702000,Bolivar,Caicara Del Orinoco,Av. Carabobo
0704000,Bolivar,Santa Elena De Uairen,Calle Ikabaru
0708000,Bolivar,Cdad Bolivar Zona Ind.,Av. Perimetral
0709000,Bolivar,Av Las Americas,Av. Las Américas (Puerto Ordaz)
0711000,Bolivar,Plaza Atlántico,Unare (Puerto Ordaz)
0800000,Carabobo,Valencia Centro,Av. Miranda
0801000,Carabobo,Valencia Big Low,Zona Ind. Castillito
0802000,Carabobo,Guacara,Calle Piar
0802100,Carabobo,Alianza Mall,Urb. Ciudad Alianza
0802500,Carabobo,Los Guayos Zona Ind.,Zona Industrial Los Guayos
0803000,Carabobo,Puerto Cabello,Calle Rondón
0803500,Carabobo,Moron,Av. Yaracuy
0804000,Carabobo,Flor Amarillo,CC Mega Mercado
0805000,Carabobo,Valencia El Trigal,CC Patio Trigal
0806000,Carabobo,Naguanagua,Av. Universidad
0808000,Carabobo,Valencia Sur,Paseo Las Industrias
0809000,Carabobo,Bejuma,Av. Los Fundadores
0810000,Carabobo,Valencia Palacio De Justicia,Av. Aranzazu
0810100,Carabobo,Av. Las Ferias,Av. Las Ferias
0811000,Carabobo,Valencia Zona Ind.,Zona Industrial
0812000,Carabobo,La Isabelica,Av. Este-Oeste
0814000,Carabobo,Valencia El Parral,CC Professional Ceravica
0815000,Carabobo,Valencia San Diego,Av. Don Julio Centeno
0815100,Carabobo,La Esmeralda San Diego,Urb. La Esmeralda
0816000,Carabobo,Valencia Norte,Av. Andrés Eloy Blanco
0817000,Carabobo,Valencia Los Guajiros,Mercado Los Guajiros
0818000,Carabobo,San Diego Terrazas De Castillito,CC Boulevard Center
0820000,Carabobo,Valencia Gobernación,Calle Colombia
0821000,Carabobo,Tocuyito,Urb. Pocaterra
0823000,Carabobo,Valencia Av. Lara,Av. Lara con Branger
0826000,Carabobo,Paraparal,CC Paraparal Plaza
0900000,Cojedes,San Carlos,Av. Bolívar
0901000,Cojedes,Tinaquillo,Av. Carabobo
1000000,Delta Amacuro,Tucupita,Calle Pativilca
1100000,Falcon,Coro,Av. Manaure
1101000,Falcon,Punto Fijo Centro,Calle Comercio
1102000,Falcon,Tucacas,Av. Libertador
1103000,Falcon,Caja De Agua,Av. Ollarvides
1104000,Falcon,Puerta Maraven,Av. Ollarvides (Punto Fijo)
1105000,Falcon,El Castillo,Calle Arismendi (Coro)
1106000,Falcon,Punto Fijo Av.Monagas,Av. Monagas
1200000,Guarico,S. Juan De Los Morros,Av. Bolívar
1201000,Guarico,Calabozo,Carrera 12
1202000,Guarico,Valle De La Pascua,Av. Rómulo Gallegos
1203000,Guarico,Zaraza,Calle Comercio
1204000,Guarico,Tucupido,Calle Roscio
1205000,Guarico,Altagracia De Orituco,Calle Ilustres Próceres
1207000,Guarico,Valle De La Pascua Norte,CC El Remanso
1300000,Lara,Bqto Centro,Carrera 19
1300200,Lara,Canaima,Calle 50
1300300,Lara,Andres Bello,Carrera 22
1301000,Lara,Bqmeto Oeste,Av. Florencio Jiménez
1302000,Lara,Carora,Av. Francisco de Miranda
1303000,Lara,Bqmeto Este,Av. Lara
1303100,Lara,Av. Moran,Av. Morán
1303200,Lara,Altagracia,Calle 20
1304000,Lara,Cabudare,Av. Santa Bárbara
1305000,Lara,Quibor,Av. Rotaria
1306000,Lara,Valle Lindo,Barrio Unión
1307000,Lara,Barquisimeto Nueva Segovia,Carrera 2
1307100,Lara,Patarata,Urb. Patarata
1308000,Lara,Babilom,CC Babilon
1308100,Lara,El Recreo,CC El Recreo
1309000,Lara,Cabudare Sur,Urb. La Mata
1310000,Lara,Av. Venezuela,Av. Venezuela con 33
1310100,Lara,Av Venezuela Este,Av. Venezuela con Bracamonte
1400000,Merida,Merida Cubo Rojo,CC Cubo Rojo
1401000,Merida,Merida Paseo De La Feria,Av. Don Tulio Febres
1402000,Merida,El Vigia,Barrio San Isidro
1403000,Merida,Tovar,Carrera 4
1404000,Merida,Ejido,Av. Fernández Peña
1405000,Merida,Merida Milla,Sector Milla
1406000,Merida,Mda Los Proceres,Av. Los Próceres
1407000,Merida,Tucanizon,Tucaní
1500000,Miranda,Los Teques,Calle Guaicaipuro
1500100,Miranda,Carrizal,CC La Cascada
1501000,Miranda,Charallave,Av. Bolívar
1501500,Miranda,Ocumare Del Tuy,Av. Ribas
1503000,Miranda,Guarenas,CC Miranda
1504000,Miranda,Guatire,Av. Intercomunal
1505000,Miranda,San Antonio De Los Altos,CC La Casona
1506000,Miranda,Higuerote,Calle Comercio
1507000,Miranda,Rio Chico,Av. Padre Zaldívar
1508000,Miranda,Sta Teresa Del Tuy,Calle Independencia
1509000,Miranda,Cua,Av. Perimetral
1510000,Miranda,Guatire Oasis,CC Oasis Center
1602000,Monagas,Punta De Mata,Calle Bolívar
1603000,Monagas,Maturin Centro,Calle Monagas
1605000,Monagas,Temblador,Av. Francisco de Miranda
1606000,Monagas,Maturin Norte,Av. Alirio Ugarte Pelayo
1607000,Monagas,Maturin Zona Industrial,Zona Industrial
1608000,Monagas,Maturin Av. Raul Leoni,Av. Raúl Leoni
1609000,Monagas,Maturin La Floresta,Sector La Floresta
1610000,Monagas,Maturin Plaza El Indio,Av. Bicentenario
1701000,Nueva Esparta,Porlamar,Calle Cedeño
1702000,Nueva Esparta,Juan Griego,Av. Leandro
1702100,Nueva Esparta,El Espinal,Municipio Díaz
1704000,Nueva Esparta,Jovito Villalba,Mene de Mauroa (Ref. Local)
1706000,Nueva Esparta,Porlamar Centro,Calle Guevara
1707000,Nueva Esparta,Villa Rosa,Av. Juan Bautista Arismendi
1800000,Portuguesa,Guanare,Carrera 5
1801000,Portuguesa,Acarigua,Av. Libertador
1802000,Portuguesa,Turen,Av. Principal
1804000,Portuguesa,Centro Los Llanos,CC Los Llanos (Acarigua)
1900000,Sucre,Cumana,Av. Perimetral
1901000,Sucre,Carupano,Calle Juncal
1902000,Sucre,Cumana Urdaneta,Calle Urdaneta
2000000,Tachira,Barrio Obrero Carrera 20,Carrera 20
2001000,Tachira,San Cristobal Concordia,La Concordia
2002000,Tachira,S. Antonio Del Tachira,Av. Venezuela
2003000,Tachira,La Fria,Calle 4
2004000,Tachira,La Grita,Calle 2
2005000,Tachira,Rubio,Av. Las Américas
2006000,Tachira,El Piñal,Troncal 5
2007000,Tachira,Tariba,Calle 8
2008000,Tachira,Barrio Obrero,Agencia Principal
2009000,Tachira,Ureña,Calle 5
2010000,Tachira,San Cristobal Centro,7ma Avenida
2011000,Tachira,Paramillo,Zona Industrial
2012000,Tachira,San Juan De Colon,Carrera 6
2100000,Trujillo,Trujillo,Av. Fuerzas Armadas
2101000,Trujillo,Valera,Calle 5
2102000,Trujillo,Carache,Calle Principal
2103000,Trujillo,Bocono,Calle Bolívar
2104000,Trujillo,Valera Los Limoncitos,Sector Los Limoncitos
2105000,Trujillo,Valera Centro,Av. Bolívar
2106000,Trujillo,Sabana De Mendoza,Av. Las Flores
2200000,La Guaira,La Guaira,Av. Soublette
2200100,La Guaira,Maiquetia,Calle Los Baños
2201000,La Guaira,Catia La Mar,Av. El Ejército
2300000,Yaracuy,San Felipe,Av. Libertador
2301000,Yaracuy,Nirgua,Av. Bolívar
2303000,Yaracuy,Yaritagua,Carrera 14
2400000,Zulia,Mbo La Limpia,Av. La Limpia
2400100,Zulia,Circunvalacion 2,Amparo
2400500,Zulia,Los Olivos,Av. La Victoria
2400600,Zulia,Maracaibo Norte,Av. Guajira
2401000,Zulia,Mbo Indio Mara,Plaza Indio Mara
2404000,Zulia,Ciudad Ojeda,Av. Intercomunal
2406000,Zulia,Manzanillo,Av. 5 (San Francisco)
2406200,Zulia,Coromoto,Urb. Coromoto
2408000,Zulia,Machiques,Calle Unión
2412000,Zulia,Cabimas,Av. Intercomunal
2413000,Zulia,La Chinita,Aeropuerto
2414000,Zulia,Mbo Irama,Calle 72
2415000,Zulia,Santa Barbara Del Zulia,Av. Bolívar
2416000,Zulia,El Venado,Carretera Lara-Zulia
2420000,Zulia,Tia Juana,Av. Intercomunal
2423000,Zulia,Mbo La Lago,Sector La Lago
2424000,Zulia,Caja Seca,Av. Panamericana
2425000,Zulia,Curva De Molina,Av. La Limpia Oeste
`;

async function bootstrap() {
    console.log('--- Starting MRW Data Import ---');

    try {
        await connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const providerModel = model(ShippingProvider.name, ShippingProviderSchema);

        // 1. Parse CSV
        const lines = MRW_CSV_DATA.trim().split('\n').filter(l => l.trim().length > 0).slice(1);
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

            // Since MRW CSV only has Agency Name, we'll use Agency Name as the "City" or "Zone" name
            // OR if we want to be smarter, we can try to guess city from name, but usually for shipping
            // Users look for a specific agency. 
            // Better Approach: Put all agencies under their State, and maybe group by "City" if inferred, 
            // but for now, let's treat the AGENCY NAME as the CITY/LOCATION selector 
            // So User Selects: Estado -> Agencia (City dropdown will list Agency Names) -> Confirm Agency
            // Or better: City dropdown lists "General" and Agency dropdown lists agencies?
            // Let's stick to the Schema: State > City > Agency.
            // We will treat "Agencia_Nombre" as the City, AND the Agency. 
            // e.g. State: Zulia, City: "Maracaibo Norte", Agency: "Maracaibo Norte (020202...)"

            const cityKey = trimmedName; // Using Agency Name as City Key

            stateMap.get(trimmedState).cities.set(cityKey, {
                code: trimmedCode, // Using agency code as city code proxy
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
        console.log(`Updating ShippingProvider 'MRW'... with ${regions.length} regions and ${agencyCount} agencies.`);

        await providerModel.findOneAndUpdate(
            { name: 'MRW' },
            {
                name: 'MRW',
                code: 'MRW-VE',
                regions: regions,
                isActive: true,
                logoUrl: '/shipping-providers/mrw.png'
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
