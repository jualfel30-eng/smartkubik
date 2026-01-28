
import { connect, model } from 'mongoose';
import { ShippingProvider, ShippingProviderSchema } from '../schemas/shipping-provider.schema';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

const ZOOM_CSV_DATA = `
Codigo,Estado,Ciudad,Agencia_Nombre,Direccion_Referencia
ZOOM C.C PLAZA ATLANTICO,Bolivar,Puerto Ordaz,Zoom C.C Plaza Atlantico,Av. Atlántico CC Plaza Atlántico Nivel PB Local PB-48-B
ZOOM SANTA ELENA DE ARENALES,Merida,Santa Elena De Arenales,Zoom Santa Elena De Arenales,Carretera Panamericana Frente al Comando Policial
ZOOM C.C SAN ONOFRE,Sucre,Cumana,Zoom C.C San Onofre,Av Humboldt CC San Onofre Nivel PB Local 13
ZOOM SANTA ROSA,Sucre,Cumana,Zoom Santa Rosa,Av. Santa Rosa CC Santa Rosa Nivel PB Local 06
ZOOM AV 4 DE MAYO,Nueva Esparta,Porlamar,Zoom Av 4 De Mayo,Av Paseo Cultural Ramon Vasquez Brito CC Boulevard Porlamar
ZOOM AV VENEZUELA CENTRO,Bolivar,Puerto Ordaz,Zoom Av Venezuela Centro,Av Venezuela con Ciudad Bolivar Edif Parque del Centro PB
ZOOM AV VICTORIA,Distrito Capital,Caracas,Zoom Av Victoria,Av. Victoria Edf. Meridional PB (Diagonal a Panadería Flor del Greco)
ZOOM C.C ALBA,Anzoategui,El Tigre,Zoom C.C Alba,Av Francisco de Miranda CC Alba Nivel Baja Local 8
ZOOM CANTAURA CENTRO,Anzoategui,Cantaura,Zoom Cantaura Centro,Av. Bolivar Cruce con Calle Arismendi
ZOOM HANGAR DISTRIBUIDORA,Bolivar,Ciudad Bolivar,Zoom Hangar Distribuidora,Av. Jesus Soto Local Hangar Distribuidora Toms
ZOOM HOTEL RASIL,Anzoategui,Puerto La Cruz,Zoom Hotel Rasil,Av. Paseo Colon Edif. Hotel Rasil Piso 1 Local 02
ZOOM 27 DE FEBRERO,Miranda,Guarenas,Zoom 27 De Febrero,Urb. 27 de Febrero Ctra Nacional Multiservicios Souto
ZOOM 3Y SAN MARTIN,Zulia,Maracaibo,Zoom 3Y San Martin,Sector Bella Vista Calle 74 con Av. 3Y
ZOOM 5TA AVENIDA I,Tachira,San Cristobal,Zoom 5Ta Avenida I,Av 5ta entre Calles 3 y 4 Edificio A.C Nro 8
ZOOM ACARIGUA,Portuguesa,Acarigua,Zoom Acarigua,Calle 30 con Av. 35 CC Páez PB Local 02
ZOOM AEROPUERTO JACINTO LARA,Lara,Barquisimeto,Zoom Aeropuerto Jacinto Lara,Aeropuerto General Jacinto Lara PB Local A-6
ZOOM ALTAMIRA,Miranda,Caracas,Zoom Altamira,Av. Del Avila Res. Belmont PB Local 01 (Altamira Sur)
ZOOM ALTO BARINAS NORTE,Barinas,Barinas,Zoom Alto Barinas Norte,Av. Colombia Local 80-C (Frente al Golfito)
ZOOM ALTO BARINAS SUR,Barinas,Barinas,Zoom Alto Barinas Sur,Av. Los Llanos CC Sion PB Local 5
ZOOM AMANA,Anzoategui,Puerto La Cruz,Zoom Amana,Calle Bolivar con Calle Maneiro CC Amana PB A-6
ZOOM AMANI CALLE COMERCIO,Aragua,Cagua,Zoom Amani Calle Comercio,Calle Comercio con Sucre Edif Amani PB
ZOOM AMPARO,Zulia,Maracaibo,Zoom Amparo,Av 58 CC Circunvalacion PB Local 9
ZOOM ANACO,Anzoategui,Anaco,Zoom Anaco,Calle 5 de Julio Edf. San Elias Nro 3-23B PB
ZOOM ANACO CENTER,Anzoategui,Anaco,Zoom Anaco Center,Av. Jose Antonio Anzoategui CC Anaco Center Piso 1
ZOOM ARAGUA,Aragua,Maracay,Zoom Aragua,Edif Torre Sindoni (Entre Av. Miranda y Bolivar)
ZOOM AV 10 CECILIO ACOSTA,Zulia,Maracaibo,Zoom Av 10 Cecilio Acosta,Av 10 entre Calles 66 y 66A
ZOOM AV 6 C.C DON ANTONIO,Yaracuy,San Felipe,Zoom Av 6 C.C Don Antonio,Av 6 entre Calle 16 y Av La Patria CC Don Antonio
ZOOM AV FERRERO TAMAYO,Tachira,San Cristobal,Zoom Av Ferrero Tamayo,Av. Ferrero Tamayo CC Barata PB-03
ZOOM AV FRANCISCO SOLANO,Distrito Capital,Caracas,Zoom Av Francisco Solano,Av Francisco Solano Lopez Torre Oasis PB Local 9
ZOOM AV FUERZAS ARMADAS,Distrito Capital,Caracas,Zoom Av Fuerzas Armadas,Av. Fuerzas Armadas Norte Esq. San Jose
ZOOM AV GERMANIA,Bolivar,Ciudad Bolivar,Zoom Av Germania,Av. Germania CC Los Proceres PB
ZOOM AV LECUNA,Distrito Capital,Caracas,Zoom Av Lecuna,Av. Lecuna Esq. Miracielos (Al lado Metro Teatros)
ZOOM AV LIBERTADOR,Distrito Capital,Caracas,Zoom Av Libertador,Av. Libertador CC Libertador Local 13
ZOOM AV LISANDRO ALVARADO,Carabobo,Valencia,Zoom Av Lisandro Alvarado,Av Lisandro Alvarado CC Torinoco PB Local 12
ZOOM AV MICHELENA,Carabobo,Valencia,Zoom Av Michelena,Av Michelena Casa 90-63 (Frente Clinica Santa Monica)
ZOOM AV MIRANDA,Merida,Merida,Zoom Av Miranda,Av. Miranda CC Doña Heraclita Local 2
ZOOM AV MONTES DE OCA CENTRO,Carabobo,Valencia,Zoom Av Montes De Oca Centro,Av 102 Monte de Oca Calle 24 de Junio
ZOOM AV ORINOCO,Amazonas,Puerto Ayacucho,Zoom Av Orinoco,Av. Orinoco Edif El Rey PB Local 02
ZOOM AV RAUL LEONI,Monagas,Maturin,Zoom Av Raul Leoni,Av. Raul Leoni Edf. Nar-Oly Torre A PB
ZOOM AV REPUBLICA,Bolivar,Ciudad Bolivar,Zoom Av Republica,Av Siegart con Av. Republica Edif Ivanna PB
ZOOM AV ROTARIA,Tachira,San Cristobal,Zoom Av Rotaria,Vda 8 y 9 Casa Nro 2-24 Sector Unidad Vecinal
ZOOM AV URDANETA,Merida,Merida,Zoom Av Urdaneta,Av Urdaneta CC Las Margaritas PB-9
ZOOM AV VENEZUELA,Tachira,San Antonio Del Tachira,Zoom Av Venezuela,Av Venezuela Carrera 6 Local 6-02
ZOOM AV. 4 BELLA VISTA,Zulia,Maracaibo,Zoom Av. 4 Bella Vista,Calle 63A entre Avs 4 y 5
ZOOM AV. ALONSO DE OJEDA,Zulia,Ciudad Ojeda,Zoom Av. Alonso De Ojeda,Av. Alonso de Ojeda Edif. Tibidabo PB Local 2
ZOOM AV. BERMUDEZ TACITA DE PLATA,Aragua,Maracay,Zoom Av. Bermudez Tacita De Plata,Av Bermudez con Av 10 de Diciembre Edif Del Pinto
ZOOM AV. BOLIVAR NORTE,Carabobo,Valencia,Zoom Av. Bolivar Norte,Av. Bolivar Norte Edf. Don Enrique PB
ZOOM AV. LA LIMPIA,Zulia,Maracaibo,Zoom Av. La Limpia,Av 28 La Limpia con Av 78
ZOOM AV. MANAURE,Falcon,Coro,Zoom Av. Manaure,Av Manaure CC San Antonio Plaza PB Local 08
ZOOM AVENIDA 19 DE ABRIL,Aragua,Maracay,Zoom Avenida 19 De Abril,Av 19 de Abril CC Mercado Ateneo Local F-08
ZOOM AVENIDA LIBERTADOR CALLE 29,Lara,Barquisimeto,Zoom Avenida Libertador Calle 29,Av Libertador entre Calles 29 y 30 Edif Vergara
ZOOM AVENIDA PASEO LIBERTADOR,Apure,San Fernando,Zoom Avenida Paseo Libertador,Av Paseo Libertador Edif Doña Isabel
ZOOM AVENIDA ROMULO GALLEGOS,Guarico,Valle De La Pascua,Zoom Avenida Romulo Gallegos,Av Romulo Gallegos Edif Adriatico PB Local 03
ZOOM BACHAQUERO,Zulia,Bachaquero,Zoom Bachaquero,Av Bolivar CC Bolivar Center Nivel 2 Local 2
ZOOM BARCELONA,Anzoategui,Barcelona,Zoom Barcelona,Av. Intercomunal Jorge Rodriguez CC Brisas del Neveri
ZOOM BARINAS,Barinas,Barinas,Zoom Barinas,Av. Elias Cordero N° 1-120
ZOOM BARINAS CENTRO,Barinas,Barinas,Zoom Barinas Centro,Calle Camejo Edificio Los Hermanos (Barrio Obrero)
ZOOM BARQUISIMETO,Lara,Barquisimeto,Zoom Barquisimeto,Carrera 24 entre Calles 23 y 24 (Frente Plaza Mora)
ZOOM BARRIO EL CARMEN,Tachira,San Cristobal,Zoom Barrio El Carmen,Calle 2 Nro 10-45 La Concordia
ZOOM BARUTA,Miranda,Caracas,Zoom Baruta,Calle Paez Local 4 (Pueblo de Baruta)
ZOOM BASE ARAGUA,Aragua,Maracay,Zoom Base Aragua,Av. Las Delicias CC Paseo Las Delicias PB
ZOOM BEJUMA,Carabobo,Bejuma,Zoom Bejuma,Av Sucre c/c Calle Heres
ZOOM BELLAS ARTES,Distrito Capital,Caracas,Zoom Bellas Artes,Av Este 2 Edificio Maya PB (La Candelaria)
ZOOM BELLO MONTE,Miranda,Caracas,Zoom Bello Monte,Av. Beethoven Edif Ibaizabal Local F (Colinas de Bello Monte)
ZOOM BIG LOW SAN DIEGO,Carabobo,San Diego,Zoom Big Low San Diego,Av. Boulevard Norte 102 CC Boulevard Norte Local 3
ZOOM BIRUACA,Apure,Biruaca,Zoom Biruaca,Av. Las Acacias Local 2
ZOOM BOCONO,Trujillo,Bocono,Zoom Bocono,Av. Carabobo Casa 6-22
ZOOM BOLEITA,Miranda,Caracas,Zoom Boleita,2da Calle de Boleita Sur Local 6
ZOOM C.C AEROCENTRO,Carabobo,Valencia,Zoom C.C Aerocentro,Av. Luis Ernesto Branger Zona Ind. Sur
ZOOM C.C AKRAI CENTER,Zulia,Maracaibo,Zoom C.C Akrai Center,Calle 86 Pichincha con Av 4 Bella Vista CC Akrai Center
ZOOM C.C ALFA ESTE,Lara,Barquisimeto,Zoom C.C Alfa Este,Av. Madrid Urb. El Parque CC Alfa PB
ZOOM C.C ALMARRIERA,Lara,Cabudare,Zoom C.C Almarriera,Av. La Montanita CC Almarriera Local L-29
ZOOM C.C BIBLOS CENTER,Bolivar,Puerto Ordaz,Zoom C.C Biblos Center,Calle Uchire CC Biblos Center Local 54
ZOOM C.C CARIBEAN PLAZA,Carabobo,Valencia,Zoom C.C Caribean Plaza,Calle San Jorge CC Caribbean Plaza PB Local 171
ZOOM C.C CENTRAL GUACARA,Carabobo,Guacara,Zoom C.C Central Guacara,Carretera Nacional Guacara-Los Guayos CC Central PB
ZOOM C.C EL RECREO,Distrito Capital,Caracas,Zoom C.C El Recreo,Av. Casanova CC El Recreo Nivel C1
ZOOM C.C FIN DE SIGLO,Carabobo,San Diego,Zoom C.C Fin De Siglo,Av. Don Julio Centeno CC Fin de Siglo Nivel Galeria
ZOOM C.C GALERIAS EL RECREO,Distrito Capital,Caracas,Zoom C.C Galerias El Recreo,Av. Venezuela CC Galerias El Recreo Nivel Avenida
ZOOM C.C GALERIAS MALL,Zulia,Maracaibo,Zoom C.C Galerias Mall,CC Galerias Mall Nivel PB Local PB-Este 4A
ZOOM C.C GUACARA PLAZA,Carabobo,Guacara,Zoom C.C Guacara Plaza,Calle Piar CC Guacara Plaza PB-09
ZOOM C.C IPSFA,Aragua,Maracay,Zoom C.C Ipsfa,Av Bolivar Este CC Los Proceres PB PCB-15
ZOOM C.C JUDIBANA,Anzoategui,Puerto La Cruz,Zoom C.C Judibana,Av Stadium CC Judibana PB
ZOOM C.C LA ESTANCIA,Lara,Cabudare,Zoom C.C La Estancia,CC La Estancia Local 20 Intercomunal Barquisimeto-Cabudare
ZOOM C.C LA FAVORITA,Bolivar,Upata,Zoom C.C La Favorita,Av Bicentenario Centro de Inversiones La Favorita PB
ZOOM C.C LA GALERIA,Carabobo,Valencia,Zoom C.C La Galeria,Calle 137 CC La Galeria PB Local 1-A6
ZOOM C.C LA HOYADA,Miranda,Los Teques,Zoom C.C La Hoyada,Calle Piar CC La Hoyada Nivel 2 Local 328
ZOOM C.C LA REDOMA,Nueva Esparta,Pampatar,Zoom C.C La Redoma,Calle Libertad CC La Redoma Nivel 1 Local 42
ZOOM C.C LAS AMERICAS,Aragua,Maracay,Zoom C.C Las Americas,Av Las Delicias CC Las Americas Mezzanina 1
ZOOM C.C MADETOR ESTE,Lara,Barquisimeto,Zoom C.C Madetor Este,Av. Venezuela CC Imeca Piso 1 Local 1-H
ZOOM C.C MARACAY PLAZA,Aragua,Maracay,Zoom C.C Maracay Plaza,Av. Bermudez CC Maracay Plaza PB Local 61-D
ZOOM C.C MARINA PLAZA,Sucre,Cumana,Zoom C.C Marina Plaza,Av. Cristobal Colon CC Marina Plaza PB-4
ZOOM C.C METROPOLIS,Carabobo,Valencia,Zoom C.C Metropolis,Autopista Regional CC Metropolis Nivel Cielo A1-300B
ZOOM C.C METROPOLIS BRM,Lara,Barquisimeto,Zoom C.C Metropolis Brm,Av. Florencio Jimenez CC Metropolis Nivel Sol
ZOOM C.C MIRANDA,Miranda,Guarenas,Zoom C.C Miranda,Av. Intercomunal Menca de Leoni CC Miranda Local 30-22
ZOOM C.C NAGUANAGUA,Carabobo,Naguanagua,Zoom C.C Naguanagua,Av Universidad CC Naguanagua PB Local 28
ZOOM C.C PARQUE REAL,Lara,Barquisimeto,Zoom C.C Parque Real,Av Lara Cruce Av Los Leones CC Parque Real Local 10
ZOOM C.C PASEO LAS INDUSTRIAS,Carabobo,Valencia,Zoom C.C Paseo Las Industrias,Av Henry Ford CC Paseo Las Industrias PB Local 7
ZOOM C.C. BELLO CAMPO,Miranda,Caracas,Zoom C.C. Bello Campo,CC Bello Campo Locales 27 28 y 29 (Chacao)
ZOOM C.C. BUENAVENTURA VISTA PLACE,Miranda,Guatire,Zoom C.C. Buenaventura Vista Place,Av. Intercomunal CC Vista Place Nivel Plaza
ZOOM C.C. GRAN BAZAR,Zulia,Maracaibo,Zoom C.C. Gran Bazar,Av 15 CC Gran Bazar Piso 1 Local ML 1480
ZOOM C.C. METROSOL,Zulia,Maracaibo,Zoom C.C. Metrosol,Av 58 CC Metrosol PB Local 19-A
ZOOM C.C. SOL DE CURPA,Portuguesa,Acarigua,Zoom C.C. Sol De Curpa,Av. Libertador CC Sol de Curpa PB Local 7
ZOOM C.C.C.T,Miranda,Caracas,Zoom C.C.C.T,CCCT Nivel 1era Etapa Local 43-R2 (Chuao)
ZOOM CABIMAS,Zulia,Cabimas,Zoom Cabimas,Carretera H CC Borjas Local 6 y 7
ZOOM CABUDARE,Lara,Cabudare,Zoom Cabudare,Av Libertador CC Libertador Local PB-02
ZOOM CAGUA,Aragua,Cagua,Zoom Cagua,Calle Rondon c/c Calle Bermudez Local L-3
ZOOM CAJA SECA,Zulia,Caja Seca,Zoom Caja Seca,Av 1ra Transversal CC Farmacia Sur del Lago PB Local 2
ZOOM CALABOZO,Guarico,Calabozo,Zoom Calabozo,Calle 5 Edificio Villavicencio PB Locales 5 y 6
ZOOM CALLE 12,Tachira,San Cristobal,Zoom Calle 12,Calle 12 entre Carrera 4 y 5ta Avenida
ZOOM CALLE 14 CENTRO-ESTE,Lara,Barquisimeto,Zoom Calle 14 Centro-Este,Calle 14 entre Carreras 18 y 19 Qta Nelly
ZOOM CALLE 15,Tachira,San Cristobal,Zoom Calle 15,Calle 15 con Carrera 22 Edif. Apolo Local 3
ZOOM CALLE 20 SUR,Anzoategui,El Tigre,Zoom Calle 20 Sur,Calle 20 Sur cruce con 5ta Carrera Bis
ZOOM CALLE ARGENTINA,Falcon,Punto Fijo,Zoom Calle Argentina,Calle Argentina esq Calle Garces
ZOOM CALLE CAMPOS,Nueva Esparta,Porlamar,Zoom Calle Campos,Calle Campos Edificio Juamo PB
ZOOM CALLE COLOMBIA,Distrito Capital,Caracas,Zoom Calle Colombia,Calle Colombia (Catia)
ZOOM CALLE GUARAGUAO,Anzoategui,Puerto La Cruz,Zoom Calle Guaraguao,Calle Las Flores con Calle Guaraguao CC Carabel PB
ZOOM CALLE MIRANDA,Miranda,Los Teques,Zoom Calle Miranda,Calle Miranda con Guaicaipuro Norte CC Oriente
ZOOM CALLE RIVAS,Miranda,Guatire,Zoom Calle Rivas,Calle Rivas Local 15 (Casco Central)
ZOOM CALLE VARGAS,Zulia,Ciudad Ojeda,Zoom Calle Vargas,Calle Vargas con Calle Campo Elias CC Nocciano PB
ZOOM CALLE VENEZUELA,Bolivar,Ciudad Bolivar,Zoom Calle Venezuela,Calle Venezuela Local 20
ZOOM CAMINO REAL,Anzoategui,Barcelona,Zoom Camino Real,Av Costanera CC Camino Real PB C11 (Nueva Barcelona)
ZOOM CAPACHO,Tachira,Capacho,Zoom Capacho,Carrera 5 CC Capin Tiendas Local 12
ZOOM CARABALLEDA,La Guaira,Caraballeda,Zoom Caraballeda,Av. La Costanera CC Margarita
ZOOM CARAYACA,La Guaira,Carayaca,Zoom Carayaca,Calle Real de Carayaca (Pueblo Arriba)
ZOOM CARIBE,La Guaira,Caraballeda,Zoom Caribe,Av Boulevard Naiguata Res Gran Terraza PB (Caribe)
ZOOM CARICUAO PLAZA,Distrito Capital,Caracas,Zoom Caricuao Plaza,Av Ppal Ruiz Pineda CC Caricuao Plaza Nivel 2
ZOOM CARORA,Lara,Carora,Zoom Carora,Av Fco de Miranda Local Tiendas Montana
ZOOM CARRERA 19,Tachira,San Cristobal,Zoom Carrera 19,Carrera 19 entre Calle 15 y 16 (Barrio Obrero)
ZOOM CARRERA 19 CON 34,Lara,Barquisimeto,Zoom Carrera 19 Con 34,Carrera 19 con Calles 33 y 34
ZOOM CARRERA 25 CALLE 41,Lara,Barquisimeto,Zoom Carrera 25 Calle 41,Carrera 25 entre Calle 40 y 41
ZOOM CARUPANO,Sucre,Carupano,Zoom Carupano,Av. Libertad con Calle Monagas Edif Turbo Oriente PB
ZOOM CARUPANO CENTRO,Sucre,Carupano,Zoom Carupano Centro,Calle Juncal cruce con Calle Bolivar Local 258
ZOOM CASCO CENTRAL I,Monagas,Maturin,Zoom Casco Central I,Av Azcue con Av Rojas Local 01
ZOOM CASCO CENTRAL LECHERIA,Anzoategui,Lecheria,Zoom Casco Central Lecheria,Carrera 5 Centro Empresarial 17-11 PB-1
ZOOM CASCO HISTORICO,Sucre,Cumana,Zoom Casco Historico,Calle Sucre CC Cumana Oficina 8
ZOOM CASTILLEJO,Miranda,Guatire,Zoom Castillejo,Av Principal CC Castillejo Nivel 1
ZOOM CATIA LA MAR,La Guaira,Catia La Mar,Zoom Catia La Mar,Av. Atlantida Qta. Hucarimar PB Local 1
ZOOM CC LOS SAMANES,Miranda,Caracas,Zoom Cc Los Samanes,Av. 1 CC Los Samanes Nivel Supermercado (Baruta)
ZOOM CDO CATIA,Distrito Capital,Caracas,Zoom Cdo Catia,Av. Ppal de Altavista Galpon Grupo Zoom
ZOOM CDO MYC,Aragua,Maracay,Zoom Cdo Myc,Av. Anthon Phillips Zona Ind. San Vicente
ZOOM CDO SVZ,Tachira,San Cristobal,Zoom Cdo Svz,Calle 14 con Callejuela La Republica (Puente Real)
ZOOM CENTRAL MADEIRENSE,Anzoategui,Puerto La Cruz,Zoom Central Madeirense,Av Municipal CC Central Madeirense PB Local 17
ZOOM CENTRO,Distrito Capital,Caracas,Zoom Centro,Calle Norte 2 Edif San Sebastian PB (Catedral)
ZOOM CENTRO ANACO,Anzoategui,Anaco,Zoom Centro Anaco,Calle Monagas Casa 1-16
ZOOM CENTRO COMERCIAL BELLO MONTE,Miranda,Caracas,Zoom Centro Comercial Bello Monte,Av. Ppal Bello Monte CC Bello Monte PB Local 10
ZOOM CENTRO EJIDO,Merida,Ejido,Zoom Centro Ejido,Calle Sucre CC Ejido PB Local 1-C
ZOOM CENTRO MERIDA,Merida,Merida,Zoom Centro Merida,Av 3 Independencia CC La Rosalera Nivel 3
ZOOM CENTRO NORTE FUERZAS ARMADAS,Zulia,Maracaibo,Zoom Centro Norte Fuerzas Armadas,Av 15 CC Norte PB Local PB-17
ZOOM CENTRO VIGIA,Merida,El Vigia,Zoom Centro Vigia,Calle 3 (Al lado Panaderia Giordano)
ZOOM CHACAITO I,Miranda,Caracas,Zoom Chacaito I,Av. Tamanaco CC Arta Piso 1 (El Rosal)
ZOOM CHACAO, C.A,Miranda,Caracas,Zoom Chacao,Calle Monseñor Juan Grilc Rezman Qta. Silvia (Chacao)
ZOOM CHARALLAVE CIUDAD CONCORDIA,Miranda,Charallave,Zoom Charallave Ciudad Concordia,Av. Tosta Garcia CC Ciudad Concordia Piso 1
ZOOM CHARALLAVE II,Miranda,Charallave,Zoom Charallave Ii,Final Av Tosta Edif Boal Local B-1 PB
ZOOM CHARITO (EL CALLAO),Bolivar,El Callao,Zoom Charito (El Callao),Callejon Gazzaneo
ZOOM CIUDAD BOLIVAR,Bolivar,Ciudad Bolivar,Zoom Ciudad Bolivar,Av. Jesus Soto CC Tepuy PB
ZOOM CIUDAD BOLIVIA-PEDRAZA,Barinas,Ciudad Bolivia,Zoom Ciudad Bolivia-Pedraza,Calle 4 Prolongacion 1
ZOOM CIUDAD OJEDA,Zulia,Ciudad Ojeda,Zoom Ciudad Ojeda,Av. Intercomunal Calle Cardon Edif Ojeda PB
ZOOM COCHE,Distrito Capital,Caracas,Zoom Coche,Av Intercomunal Valle Coche CC Coche PB Local 25
ZOOM COLON,Tachira,Colon,Zoom Colon,Carrera 7 con Calle 3
ZOOM COLONCITO,Tachira,Coloncito,Zoom Coloncito,Calle 2 entre Carreras 18 y 19 (Terminal)
ZOOM COLONIA TOVAR,Aragua,Colonia Tovar,Zoom Colonia Tovar,Carretera Principal CC Parque Moritz Nivel 1
ZOOM CORO,Falcon,Coro,Zoom Coro,Av. Los Medanos Edif. Aref PB (Los Tres Platos)
ZOOM CORREDOR VIAL TOMAS MONTILLA,Portuguesa,Guanare,Zoom Corredor Vial Tomas Montilla,Carrera 7 Edif Forum Piso 1 Local 2
ZOOM COSTO SUPERMERCADO,Sucre,Cumana,Zoom Costo Supermercado,Av Aristides Rojas CC Permagas PB
ZOOM CUA,Miranda,Cua,Zoom Cua,Calle Jose Maria Carreño Local Minicozzi PB
ZOOM CUMANA,Sucre,Cumana,Zoom Cumana,Av Santa Rosa Edif Grupo Profesional Santa Rosa PB
ZOOM DABAJURO,Falcon,Dabajuro,Zoom Dabajuro,Av Bolivar Local S/N
ZOOM DELICIAS,Zulia,Maracaibo,Zoom Delicias,Av 15 Prolongacion Delicias CC Luz y Sol
ZOOM DON BOSCO,Miranda,Caracas,Zoom Don Bosco,Av San Juan Bosco Edif May Flower PB (Altamira)
ZOOM EDIFICIO D MAIO,Zulia,Cabimas,Zoom Edificio D Maio,Av Intercomunal Edif Hotel D Maio PB
ZOOM EJIDO MALL,Merida,Ejido,Zoom Ejido Mall,CC Ejido Mall Local PB-B-17
ZOOM EL CALLAO,Bolivar,El Callao,Zoom El Callao,Calle Bolivar (Diagonal a la Policia)
ZOOM EL CEMENTERIO,Distrito Capital,Caracas,Zoom El Cementerio,Av. Ppal del Cementerio Mercapop Pasillo 6
ZOOM EL CONSUL,La Guaira,Maiquetia,Zoom El Consul,Calle Los Pipotes Casa 129 PB
ZOOM EL LIMON,Aragua,El Limon,Zoom El Limon,Av. Universidad CC El Limon PB Local 03
ZOOM EL MARQUES,Miranda,Caracas,Zoom El Marques,Av. Sanz CC El Marques Locales 2-3
ZOOM EL PIÑAL,Tachira,El Pinal,Zoom El Piñal,Calle 1 entre Carrera 3 y 4
ZOOM EL SOMBRERO,Guarico,El Sombrero,Zoom El Sombrero,Calle Fraternidad (Frente Plaza Bolivar)
ZOOM EL TIGRE,Anzoategui,El Tigre,Zoom El Tigre,Av. Fco. de Miranda CC Flamingo PB
ZOOM EL TIGRITO,Anzoategui,El Tigrito,Zoom El Tigrito,Av Fernandez Padilla CC Deca Local 3
ZOOM EL TOCUYO,Lara,El Tocuyo,Zoom El Tocuyo,Calle 20 entre 7 y 8 (Urb Corpahuaico)
ZOOM EL VALLE,Distrito Capital,Caracas,Zoom El Valle,Calle Cajigal CC El Valle Nivel 3
ZOOM EL VENADO,Zulia,El Venado,Zoom El Venado,CC Vera Cruz PB Pasillo Principal
ZOOM EL VIGIA,Merida,El Vigia,Zoom El Vigia,Av. 3 Barrio Panamericano
ZOOM ELARBA I,Monagas,Maturin,Zoom Elarba I,Av Bolivar Edif Elarba PB Local 133
ZOOM FERIAL PUNTO EXPRESS,Falcon,Coro,Zoom Ferial Punto Express,Calle Falcon CC Ferial PB Local 01
ZOOM FLOR AMARILLO,Carabobo,Valencia,Zoom Flor Amarillo,Av. 107-C CC La Fundacion Local 1
ZOOM FORUM IPSFA,Distrito Capital,Caracas,Zoom Forum Ipsfa,CC Los Proceres (IPSFA) Paseo Los Ilustres
ZOOM FUERZAS AÉREAS-LAS ACACIAS,Aragua,Maracay,Zoom Fuerzas Aéreas-Las Acacias,Av Fuerzas Aereas Nro 93
ZOOM GALERIAS LAS AMERICAS,Miranda,San Antonio De Los Altos,Zoom Galerias Las Americas,Carretera Panamericana Km 15 CC Galeria Las Americas Nivel 1
ZOOM GUANARE,Portuguesa,Guanare,Zoom Guanare,Av. Simon Bolivar CC Autocentro PB
ZOOM GUARENAS,Miranda,Guarenas,Zoom Guarenas,Zona Industrial Santa Cruz Urb. Los Naranjos
ZOOM GUASIPATI,Bolivar,Guasipati,Zoom Guasipati,Calle Merida CC Clement Nivel 1
ZOOM HIGUEROTE,Miranda,Higuerote,Zoom Higuerote,Av. Andres Bello CC Anjulicar PB
ZOOM HYPER JUMBO,Aragua,Maracay,Zoom Hyper Jumbo,Av. Fuerzas Aereas CC Hyper Jumbo Nivel Sotano
ZOOM JARDINES DEL VALLE,Distrito Capital,Caracas,Zoom Jardines Del Valle,Calle Real de los Jardines del Valle Calle 14
ZOOM JUAN GRIEGO,Nueva Esparta,Juan Griego,Zoom Juan Griego,CC La Estancia Local L23
ZOOM KILOMETRO 4,Zulia,Maracaibo,Zoom Kilometro 4,Calle 148 Edif Tami (Via Zona Industrial)
ZOOM LA CALIFORNIA,Miranda,Caracas,Zoom La California,Av Francisco de Miranda Res Monaco Local B
ZOOM LA CANDELARIA,Distrito Capital,Caracas,Zoom La Candelaria,Av Este 2 Edif Res Yanoral PB
ZOOM LA CANDELARIA VALENCIA,Carabobo,Valencia,Zoom La Candelaria Valencia,Valencia Center PB Local 38
ZOOM LA CAROLINA,Barinas,Barinas,Zoom La Carolina,Av Andres Varela Estadio Agustin Tovar
ZOOM LA CASCADA,Miranda,Carrizal,Zoom La Cascada,Carretera Panamericana Km 21 CC La Cascada PB-43
ZOOM LA CHINITA,Zulia,Maracaibo,Zoom La Chinita,CC La Chinita Nivel 1 Local 26
ZOOM LA CONCEPCION,Miranda,Los Teques,Zoom La Concepcion,Sector Los Lirios La Concepcion (Los Teques)
ZOOM LA CONCHA LECHERIA,Anzoategui,Lecheria,Zoom La Concha Lecheria,Av Principal CC La Concha Local 17
ZOOM LA CONCORDIA,Tachira,San Cristobal,Zoom La Concordia,Av 19 de Abril Nro 9-29
ZOOM LA COOPERATIVA,Aragua,Maracay,Zoom La Cooperativa,Av. Ppal. La Cooperativa c/c Calle Urdaneta
ZOOM LA COROMOTO,Zulia,Maracaibo,Zoom La Coromoto,Calle 165 CC Sara Faria PB Local 3
ZOOM LA COROMOTO BOULEVARD,Zulia,Maracaibo,Zoom La Coromoto Boulevard,Calle 171 Local Nro 44-73
ZOOM LA FLORIDA,Distrito Capital,Caracas,Zoom La Florida,Av. Juan Bautista Arismendi
ZOOM LA FRIA,Tachira,La Fria,Zoom La Fria,Calle 2 entre Carreras 18 y 19 (Terminal)
ZOOM LA GRITA C.A,Tachira,La Grita,Zoom La Grita C.A,Calle 2 entre Carreras 11 y 12
ZOOM LA HOYADA,Distrito Capital,Caracas,Zoom La Hoyada,Av Fuerzas Armadas Edf La Galeria PB Local 8
ZOOM LA ISABELICA,Carabobo,Valencia,Zoom La Isabelica,Av 73 CC Metro Sur Local 17
ZOOM LA PARROQUIA,Merida,Merida,Zoom La Parroquia,Calle Paez Casa 2-35 Local A
ZOOM LA PASTORA,Distrito Capital,Caracas,Zoom La Pastora,Calle Principal Local 02 (La Pastora)
ZOOM LA PUMAROSA,Falcon,Punto Fijo,Zoom La Pumarosa,Av. Rafael Gonzalez Edf. Brisanca
ZOOM LA TAHONA,Miranda,Caracas,Zoom La Tahona,Av La Guairita Calle Reyna (Instituto Avepane)
ZOOM LA URBINA,Miranda,Caracas,Zoom La Urbina,Calle 7 Edif Grupo Zoom (La Urbina)
ZOOM LA VICTORIA,Aragua,La Victoria,Zoom La Victoria,Calle Rivas Davila CC Victoria Center PB A-6
ZOOM LA VILLA DEL ROSARIO,Zulia,Villa Del Rosario,Zoom La Villa Del Rosario,Av. 18 de Octubre Local 18-13
ZOOM LAGUNILLAS,Merida,Lagunillas,Zoom Lagunillas,Av 6 Agua de Urao (Pueblo Viejo)
ZOOM LARA PALACE,Lara,Barquisimeto,Zoom Lara Palace,Carrera 23 Res Lara Palace 1-06
ZOOM LAS INDUSTRIAS,Lara,Barquisimeto,Zoom Las Industrias,Av. Las Industrias Edif. Sede de Industriales
ZOOM LAS MARGARITAS,Falcon,Punto Fijo,Zoom Las Margaritas,Av Coro Local Central (Las Margaritas)
ZOOM LAS MERCEDES,Miranda,Caracas,Zoom Las Mercedes,Calle Veracruz Edif Torreon PB Local 4
ZOOM LAS PALMAS,Distrito Capital,Caracas,Zoom Las Palmas,Av. Las Palmas Edf. Palma Alta Local 4
ZOOM LOS AVIADORES,Aragua,Maracay,Zoom Los Aviadores,CC Parque Los Aviadores Local L-218
ZOOM LOS CHAGUARAMOS,Distrito Capital,Caracas,Zoom Los Chaguaramos,Calle Razetti Qta Centro Profesional PB
ZOOM LOS CORTIJOS,Miranda,Caracas,Zoom Los Cortijos,Av. Francisco de Miranda Edif Centro Empresarial Don Bosco PB
ZOOM LOS DOS CAMINOS,Miranda,Caracas,Zoom Los Dos Caminos,Av Sucre Centro Parque Boyaca PB 11
ZOOM LOS GUAYOS,Carabobo,Los Guayos,Zoom Los Guayos,Calle Paez Local A-01
ZOOM LOS NARANJOS,Miranda,Caracas,Zoom Los Naranjos,Av. El Pauji CC Galerias Los Naranjos Piso 2
ZOOM LOS OLIVOS,Bolivar,Puerto Ordaz,Zoom Los Olivos,CC Santo Tome III PB Local PB-05
ZOOM LOS PALOS GRANDES,Miranda,Caracas,Zoom Los Palos Grandes,1ra Transversal Edif Green Palace PB Local 4
ZOOM LOS POSTES NEGROS,Zulia,Maracaibo,Zoom Los Postes Negros,Av 28 Casa 7-59 (Barrio Sebastopol)
ZOOM LOS PROCERES,Merida,Merida,Zoom Los Proceres,Av Los Proceres Edif Longimar PB
ZOOM LOS ROBLES,Nueva Esparta,Pampatar,Zoom Los Robles,Av Jovito Villalba CC Centro Artesanal Los Robles
ZOOM LOS RUICES,Miranda,Caracas,Zoom Los Ruices,Av Francisco de Miranda CC Los Ruices PB Local 11
ZOOM LOS SAMANES,Monagas,Maturin,Zoom Los Samanes,Calle Principal CC Los Samanes PB Local 1
ZOOM LOS TEQUES,Miranda,Los Teques,Zoom Los Teques,Av. Pedro Ruffo Ferrer CC Los Teques Local A5
ZOOM MACHIQUES,Zulia,Machiques,Zoom Machiques,Av Artes Casa S/N
ZOOM MAIQUETIA,La Guaira,Maiquetia,Zoom Maiquetia,Av. Soublette CC Litoral Local 12
ZOOM MAKRO LA YAGUARA,Distrito Capital,Caracas,Zoom Makro La Yaguara,Av. Intercomunal de Antimano (Makro)
ZOOM MANZANARES,Miranda,Caracas,Zoom Manzanares,Av. Principal CC Manzanares II Local M104
ZOOM MARACAIBO,Zulia,Maracaibo,Zoom Maracaibo,Av. 5 de Julio Calle 77 con Av. 12
ZOOM MARACAY AV. MIRANDA,Aragua,Maracay,Zoom Maracay Av. Miranda,Av. Miranda Oeste Nro 165
ZOOM MATURIN,Monagas,Maturin,Zoom Maturin,Av. Bicentenario Edificio Congesa Local I y II
ZOOM MENE GRANDE,Zulia,Mene Grande,Zoom Mene Grande,Mene Grande La Linea
ZOOM MERCADO MURACHI,Merida,Merida,Zoom Mercado Murachi,Av. Las Americas Mercado Murachi Local 44
ZOOM MERIDA,Merida,Merida,Zoom Merida,Calle 36 Edif El Parque PB Local 35-65
ZOOM METROCENTER CAPITOLIO,Distrito Capital,Caracas,Zoom Metrocenter Capitolio,Av Universidad CC Metrocenter (Capitolio)
ZOOM MONTALBAN,Carabobo,Montalban,Zoom Montalban,Av. Bolivar Local 2 (Centro Montalban)
ZOOM MONTALBAN I,Distrito Capital,Caracas,Zoom Montalban I,Av. Montalban I CC Uslar Nivel Mirador
ZOOM MONTALBAN III,Distrito Capital,Caracas,Zoom Montalban Iii,CC Caracas Piso 1 Local 01-15 (Montalban III)
ZOOM MUCUCHIES,Merida,Mucuchies,Zoom Mucuchies,Av Independencia Esq Calle Sucre Nro 69
ZOOM MULTICENTRO EMPRESARIAL DEL ESTE,Miranda,Caracas,Zoom Multicentro Empresarial Del Este,Av. Fco de Miranda Torre Miranda PB Local 04
ZOOM MULTISERVICIOS BARRIO OBRERO,Tachira,San Cristobal,Zoom Multiservicios Barrio Obrero,Calle 11 entre Carreras 18 y 19
ZOOM NAGUANAGUA CC CRISTAL,Carabobo,Naguanagua,Zoom Naguanagua Cc Cristal,Av Feo La Cruz CC Cristal PB Local PBA08
ZOOM OCUMARE DEL TUY,Miranda,Ocumare Del Tuy,Zoom Ocumare Del Tuy,Calle Principal CC Residencia La Acequia PB
ZOOM ORINOKIA MALL,Bolivar,Puerto Ordaz,Zoom Orinokia Mall,CC Orinokia Mall Nivel Plaza Santo Tome
ZOOM PALMIRA,Tachira,Palmira,Zoom Palmira,Carretera 5 Local 2
ZOOM PARAMILLO,Tachira,San Cristobal,Zoom Paramillo,Av 4 Edif Minicentro Paramillo Piso 3
ZOOM PARQUE CARACAS-LA CANDELARIA,Distrito Capital,Caracas,Zoom Parque Caracas-La Candelaria,Av. Este 2 CC Parque Caracas PB Local 36
ZOOM PARQUE HUMBOLDT,Miranda,Caracas,Zoom Parque Humboldt,CC Parque Humboldt Local 10 (Prados del Este)
ZOOM PLAZA DE TOROS,Zulia,Maracaibo,Zoom Plaza De Toros,Calle 52-A Local 1380000 (Plaza de Toros)
ZOOM PLAZA LAS AMERICAS,Miranda,Caracas,Zoom Plaza Las Americas,Av Raul Leoni CC Plaza Las Americas PB Local 2
ZOOM PLAZA MADARIAGA,Distrito Capital,Caracas,Zoom Plaza Madariaga,Av. Los Samanes CC Euro PB Local 12 (El Paraiso)
ZOOM POMONA,Zulia,Maracaibo,Zoom Pomona,Barrio San Trino Calle 102 Local 18-26
ZOOM PORLAMAR,Nueva Esparta,Porlamar,Zoom Porlamar,Av. 4 de Mayo Res. Panerco PB Local 1
ZOOM PORLAMAR CENTRO,Nueva Esparta,Porlamar,Zoom Porlamar Centro,Calle Velasquez CC Concord Local 100
ZOOM PRADOS DEL ESTE,Miranda,Caracas,Zoom Prados Del Este,Av. Ppal. Prados del Este CC Galerias Prados del Este
ZOOM PROPATRIA,Distrito Capital,Caracas,Zoom Propatria,Av Simon Bolivar CC Propatria Nivel 1
ZOOM PUEBLO NUEVO,Guarico,San Juan De Los Morros,Zoom Pueblo Nuevo,Av. Bolivar cruce con 1ro de Mayo
ZOOM PUEBLO NUEVO NORTE,Anzoategui,El Tigre,Zoom Pueblo Nuevo Norte,Calle 18 Norte Local 04
ZOOM PUERTA MARAVEN,Falcon,Punto Fijo,Zoom Puerta Maraven,Av. Ollarvides Local 264
ZOOM PUERTO AYACUCHO,Amazonas,Puerto Ayacucho,Zoom Puerto Ayacucho,Av. Rio Negro CC Juncosa Local 2-A
ZOOM PUERTO CABELLO,Carabobo,Puerto Cabello,Zoom Puerto Cabello,Primera Calle Segrestaa Edif Enna PB
ZOOM PUERTO ORDAZ,Bolivar,Puerto Ordaz,Zoom Puerto Ordaz,Sector Unare Zona Ind. I Calle Tunapuy
ZOOM PUERTO PIRITU,Anzoategui,Puerto Piritu,Zoom Puerto Piritu,Calle Bolivar CC Zeghen PB Local 06
ZOOM PUNTA DE MATA,Monagas,Punta De Mata,Zoom Punta De Mata,Av Bolivar CC Jupiter Center PB Local 10
ZOOM PUNTO FIJO,Falcon,Punto Fijo,Zoom Punto Fijo,Calle Arismendi entre Talavera y Las Palmas
ZOOM QUIBOR,Lara,Quibor,Zoom Quibor,Av 5 entre Calles 12 y 13
ZOOM QUINTA CRESPO,Distrito Capital,Caracas,Zoom Quinta Crespo,Av. Baralt CC Doral Baralt Nivel 1 Local 30
ZOOM RATTAN PLAZA,Nueva Esparta,Pampatar,Zoom Rattan Plaza,Av Jovito Villalba CC Rattan Hyperplaza Mezzanina
ZOOM RUBIO,Tachira,Rubio,Zoom Rubio,Calle 14 CC Doña Ivonne PB Local 6 y 7
ZOOM SAMBIL LA CANDELARIA,Distrito Capital,Caracas,Zoom Sambil La Candelaria,Av. Este 0 CC Sambil La Candelaria Nivel Sotano 1
ZOOM SAMBIL MARGARITA,Nueva Esparta,Pampatar,Zoom Sambil Margarita,Av Jovito Villalba Sambil Margarita Local T01A
ZOOM SAN ANTONIO,Tachira,San Antonio Del Tachira,Zoom San Antonio,Calle 9 Nro 10-44 Barrio La Popa
ZOOM SAN CARLOS,Cojedes,San Carlos,Zoom San Carlos,Av. Bolivar CC Colavita PB Locales L1 y L2
ZOOM SAN CRISTOBAL,Tachira,San Cristobal,Zoom San Cristobal,Av. Libertador Edif El Maracucho PB Local A-56
ZOOM SAN FELIPE,Yaracuy,San Felipe,Zoom San Felipe,Av. La Patria CC Aracoi Local C-5
ZOOM SAN FELIX,Bolivar,San Felix,Zoom San Felix,Av. Morena Mendoza CC La Cariñosa Local C
ZOOM SAN FERNANDO DE APURE,Apure,San Fernando,Zoom San Fernando De Apure,Calle Bolivar Edificio Lara PB
ZOOM SAN JUAN DE LOS MORROS,Guarico,San Juan De Los Morros,Zoom San Juan De Los Morros,Av Bolivar Torre Tauro PB
ZOOM SAN MARTIN,Distrito Capital,Caracas,Zoom San Martin,Av. San Martin Edif Komplot PB (Los Molinos)
ZOOM SANTA BARBARA,Barinas,Santa Barbara De Barinas,Zoom Santa Barbara,Sector Pueblo Viejo Carrera 5
ZOOM SANTA BARBARA DEL ZULIA,Zulia,Santa Barbara Del Zulia,Zoom Santa Barbara Del Zulia,Av Bolivar CC Dorado PB Local 02
ZOOM SANTA CRUZ DE ARAGUA,Aragua,Santa Cruz De Aragua,Zoom Santa Cruz De Aragua,Av 02 Zona Industrial Santa Cruz
ZOOM SANTA FE,Miranda,Caracas,Zoom Santa Fe,Av. Jose Maria Vargas CC Santa Fe Nivel C-3
ZOOM SANTA RITA,Zulia,Maracaibo,Zoom Santa Rita,Av 8 Edif El Globo PB Local 3
ZOOM SANTA ROSALIA,Distrito Capital,Caracas,Zoom Santa Rosalia,Esq. Muerto a Pelaez Casa 116
ZOOM SANTA TERESA,Tachira,San Cristobal,Zoom Santa Teresa,Calle Principal CC Casa Grande PB
ZOOM SANTA TERESA DEL TUY,Miranda,Santa Teresa Del Tuy,Zoom Santa Teresa Del Tuy,Calle Sucre con Av. Ayacucho Local C-3
ZOOM SECTOR ROJAS QUEIPO,Carabobo,Valencia,Zoom Sector Rojas Queipo,Calle Rojas Queipo 102-25 Local 02
ZOOM SECTOR SAN MIGUEL,Aragua,Maracay,Zoom Sector San Miguel,Av. Marino Sur Centro Empresarial Uniaragua PB
ZOOM SIERRA MAESTRA,Zulia,Maracaibo,Zoom Sierra Maestra,Calle 13 CC Oasis PB Local L-3
ZOOM SOCOPO,Barinas,Socopo,Zoom Socopo,Cr 9 entre Calles 3 y 4 CC Galerias PB
ZOOM TAQUILLA CC ARTICA,Bolivar,Puerto Ordaz,Zoom Taquilla Cc Artica,CC Artica Carrera Guasipati Locales 5 y 6
ZOOM TARIBA,Tachira,Tariba,Zoom Tariba,Calle 6 con Carrera 6 Casa 5-70
ZOOM TEATRO MUNICIPAL DE VALENCIA,Carabobo,Valencia,Zoom Teatro Municipal De Valencia,Calle Colombia CC Fiera Mosca PB Local 2
ZOOM TELARES LOS ANDES,Distrito Capital,Caracas,Zoom Telares Los Andes,CC Telares Los Andes Local 38 (Sector Azul)
ZOOM TEMBLADOR,Monagas,Temblador,Zoom Temblador,Calle Sucre Casa S/N
ZOOM TERMINAL PASAJEROS,Anzoategui,Puerto La Cruz,Zoom Terminal Pasajeros,Terminal de Pasajeros Local 71
ZOOM TERRAZAS DEL AVILA,Miranda,Caracas,Zoom Terrazas Del Avila,Av Ppal Terrazas del Avila CC El Avila Nivel C-3
ZOOM TIPURO,Monagas,Maturin,Zoom Tipuro,Av Ppal de Tipuro CC Tipuro Norte Local 53
ZOOM TORRE CAURA,Bolivar,Puerto Ordaz,Zoom Torre Caura,Ctra Tocoma CC Torre Caura Nivel Sotano
ZOOM TORRE EXA,Miranda,Caracas,Zoom Torre Exa,Av Libertador CC Exa PB Local 17 (El Rosal)
ZOOM TOVAR,Merida,Tovar,Zoom Tovar,Av Cristobal Mendoza Edif Echeverria Piso 1
ZOOM TRUJILLO,Trujillo,Trujillo,Zoom Trujillo,Av Bolivar CC Solunto Nivel 1 Local 1
ZOOM TUCUPITA CENTRO,Delta Amacuro,Tucupita,Zoom Tucupita Centro,Calle La Paz Local S/N
ZOOM TUMEREMO CALLE BOLIVAR,Bolivar,Tumeremo,Zoom Tumeremo Calle Bolivar,Calle Sur Este Local 01
ZOOM TUREN,Portuguesa,Turen,Zoom Turen,Av. Ricardo Perez Zambrano Edif. Agosi
ZOOM TURMERO CENTRO,Aragua,Turmero,Zoom Turmero Centro,Calle Urdaneta Casa 16 y 1
ZOOM TURMERO ENCRUCIJADA,Aragua,Turmero,Zoom Turmero Encrucijada,Carretera Nacional Turmero CC Paseo Los Laureles PB
ZOOM TURMERO INTERCOMUNAL,Aragua,Turmero,Zoom Turmero Intercomunal,Av Intercomunal CC Intercomunal Center Local 1-7
ZOOM UGARTE PELAYO,Monagas,Maturin,Zoom Ugarte Pelayo,Av. Alirio Ugarte Pelayo Edificio Vespa Local 6
ZOOM UPATA C.C DATIL,Bolivar,Upata,Zoom Upata C.C Datil,Av Bicentenario CC El Datil PB
ZOOM UREÑA,Tachira,Urena,Zoom Ureña,Calle 5 Barrio La Goajira
ZOOM VALENCIA,Carabobo,Valencia,Zoom Valencia,Av. Este Oeste Parque Comercial Castillito
ZOOM VALERA,Trujillo,Valera,Zoom Valera,Av Bolivar Edificio Galotta II
ZOOM VALERA CENTRO,Trujillo,Valera,Zoom Valera Centro,Calle 6 CC Canaima PB Local L-20
ZOOM VALLE DE LA PASCUA,Guarico,Valle De La Pascua,Zoom Valle De La Pascua,Av Las Industrias CC La Pascua Center Local 2
ZOOM VARYNÁ ALTO BARINAS SUR,Barinas,Barinas,Zoom Varyná Alto Barinas Sur,Av. Venezuela con Calle Justicia Local 127 B-3
ZOOM VENECIA,Anzoategui,Barcelona,Zoom Venecia,Av Nueva Esparta CC Nascar PB Local 06
ZOOM VILLA AFRICANA,Bolivar,Puerto Ordaz,Zoom Villa Africana,CC Gigia Local 1 (Urb Villa Africana)
ZOOM VILLA DE CURA,Aragua,Villa De Cura,Zoom Villa De Cura,Calle Sucre CC Villa Hermosa Local 39
ZOOM YARITAGUA,Yaracuy,Yaritagua,Zoom Yaritagua,Av. Padre Torres Calle 19
`;

async function bootstrap() {
    console.log('--- Starting Grupo Zoom Data Import ---');

    try {
        await connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const providerModel = model(ShippingProvider.name, ShippingProviderSchema);

        // 1. Parse CSV
        const lines = ZOOM_CSV_DATA.trim().split('\n').filter(l => l.trim().length > 0).slice(1);
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
        console.log(`Updating ShippingProvider 'Grupo Zoom'... with ${regions.length} regions and ${agencyCount} agencies.`);

        await providerModel.findOneAndUpdate(
            { name: 'Grupo Zoom' },
            {
                name: 'Grupo Zoom',
                code: 'ZOOM-VE',
                regions: regions,
                isActive: true,
                logoUrl: '/shipping-providers/zoom.png'
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
