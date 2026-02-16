import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { getModelToken } from "@nestjs/mongoose";
import { ShippingProvider } from "../schemas/shipping-provider.schema";
import { Model } from "mongoose";

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const shippingProviderModel = app.get<Model<ShippingProvider>>(
        getModelToken(ShippingProvider.name),
    );

    console.log("Seeding Shipping Providers...");

    const providers = [
        {
            name: "Grupo Zoom",
            code: "ZOOM-VE",
            isActive: true,
            website: "https://zoom.red",
            logoUrl: "/shipping-providers/zoom.png",
            regions: [
                {
                    state: "Carabobo",
                    cities: [
                        {
                            name: "Valencia",
                            agencies: [
                                {
                                    code: "0205",
                                    name: "ZOOM Valencia Zona Industrial",
                                    address: "Av. Henry Ford, C.C. Paseo Las Industrias",
                                    phone: "0501-9666-000",
                                },
                                {
                                    code: "0200",
                                    name: "ZOOM Valencia Centro",
                                    address: "Av. Bolívar Norte, Torre Banaven",
                                },
                            ],
                        },
                    ],
                },
                {
                    state: "Distrito Capital",
                    cities: [
                        {
                            name: "Caracas",
                            agencies: [
                                {
                                    code: "0101",
                                    name: "ZOOM La Urbina",
                                    address: "Calle 4 con Calle 8, La Urbina",
                                },
                                {
                                    code: "0102",
                                    name: "ZOOM Chacao",
                                    address: "Av. Francisco de Miranda, Edif. Easo",
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: "MRW",
            code: "MRW-VE",
            isActive: true,
            website: "http://www.mrw.com.ve",
            logoUrl: "/shipping-providers/mrw.png",
            regions: [
                {
                    state: "Miranda",
                    cities: [
                        {
                            name: "Baruta",
                            agencies: [
                                {
                                    code: "0180",
                                    name: "MRW Las Mercedes",
                                    address: "Av. Principal de Las Mercedes",
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: "Tealca",
            code: "TEALCA-VE",
            isActive: true,
            website: "https://www.tealca.com",
            logoUrl: "/shipping-providers/tealca.svg",
            regions: [],
        },
        {
            name: "Liberty Express",
            code: "LIBERTY-VE",
            isActive: true,
            website: "https://www.libertyexpress.com/venezuela",
            logoUrl: "/shipping-providers/liberty.svg",
            regions: [],
        },
    ];

    for (const provider of providers) {
        const existing = await shippingProviderModel.findOne({
            code: provider.code,
        });
        if (!existing) {
            await shippingProviderModel.create(provider);
            console.log(`Created provider: ${provider.name}`);
        } else {
            console.log(`Provider already exists: ${provider.name}. Updating metadata...`);
            // Don't overwrite regions if seed has empty regions (to preserve imported data)
            const updatePayload: any = { ...provider };
            if (provider.regions.length === 0) {
                delete updatePayload.regions;
            }
            await shippingProviderModel.updateOne({ code: provider.code }, updatePayload);
        }
    }

    console.log("Seeding complete.");
    await app.close();
}

bootstrap();
