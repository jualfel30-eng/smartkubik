/**
 * Seed para crear datos de demostración del storefront
 *
 * Crea:
 * - 2 tenants de ejemplo (tienda de alimentos y salón de belleza)
 * - 2 configuraciones de storefront
 * - Productos de ejemplo para cada tenant
 *
 * Uso:
 * npm run seed:storefront
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  StorefrontConfig,
  StorefrontConfigDocument,
} from "../../schemas/storefront-config.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";

@Injectable()
export class StorefrontDemoSeed {
  private readonly logger = new Logger(StorefrontDemoSeed.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(StorefrontConfig.name)
    private storefrontModel: Model<StorefrontConfigDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async seed() {
    this.logger.log("🌱 Starting storefront demo seed...");

    try {
      // Limpiar datos existentes de demo
      await this.cleanDemoData();

      // Crear tenants
      const ecommerceTenant = await this.createEcommerceTenant();
      const servicesTenant = await this.createServicesTenant();

      // Crear storefronts
      await this.createEcommerceStorefront(ecommerceTenant._id);
      await this.createServicesStorefront(servicesTenant._id);

      // Crear productos
      await this.createEcommerceProducts(ecommerceTenant._id);
      await this.createServicesProducts(servicesTenant._id);

      this.logger.log("✅ Storefront demo seed completed successfully!");
      this.logger.log("");
      this.logger.log("🌐 Access the storefronts at:");
      this.logger.log(
        "   E-commerce: http://localhost:3001/tienda-ejemplo.localhost",
      );
      this.logger.log(
        "   Services:   http://localhost:3001/salon-belleza.localhost",
      );
      this.logger.log("");
    } catch (error) {
      this.logger.error("❌ Error seeding storefront demo:", error);
      throw error;
    }
  }

  private async cleanDemoData() {
    this.logger.log("🧹 Cleaning existing demo data...");

    await this.storefrontModel.deleteMany({
      domain: { $in: ["tienda-ejemplo.localhost", "salon-belleza.localhost"] },
    });

    await this.tenantModel.deleteMany({
      name: {
        $in: ["Tienda de Alimentos Premium", "Salón de Belleza Elegance"],
      },
    });

    await this.productModel.deleteMany({
      name: {
        $regex:
          /^(Harina de Maíz|Aceite de Girasol|Arroz Blanco|Pasta Larga|Azúcar Refinada|Café Molido|Corte de Cabello|Coloración|Manicure)/,
      },
    });
  }

  private async createEcommerceTenant(): Promise<TenantDocument> {
    this.logger.log("Creating e-commerce tenant...");

    const tenant = new this.tenantModel({
      name: "Tienda de Alimentos Premium",
      businessType: "food_retail",
      contactInfo: {
        email: "contacto@tiendapremium.com",
        phone: "+58 412-1234567",
        address: "Caracas, Venezuela",
      },
      enabledModules: {
        ecommerce: true,
        inventory: true,
        orders: true,
        products: true,
      },
      subscription: {
        plan: "professional",
        status: "active",
        startDate: new Date(),
      },
      isActive: true,
    });

    return await tenant.save();
  }

  private async createServicesTenant(): Promise<TenantDocument> {
    this.logger.log("Creating services tenant...");

    const tenant = new this.tenantModel({
      name: "Salón de Belleza Elegance",
      businessType: "beauty_salon",
      contactInfo: {
        email: "info@salonelegance.com",
        phone: "+58 412-7654321",
        address: "Av. Principal, Centro Comercial Plaza, Local 15, Caracas",
      },
      enabledModules: {
        ecommerce: true,
        appointments: true,
        customers: true,
      },
      subscription: {
        plan: "professional",
        status: "active",
        startDate: new Date(),
      },
      isActive: true,
    });

    return await tenant.save();
  }

  private async createEcommerceStorefront(tenantId: any) {
    this.logger.log("Creating e-commerce storefront config...");

    const storefront = new this.storefrontModel({
      tenantId,
      domain: "tienda-ejemplo.localhost",
      isActive: true,
      theme: {
        primaryColor: "#3B82F6",
        secondaryColor: "#10B981",
      },
      templateType: "ecommerce",
      seo: {
        title: "Tienda de Alimentos Premium",
        description: "Los mejores productos alimenticios de Venezuela",
        keywords: ["alimentos", "tienda", "venezuela", "premium", "comida"],
      },
      socialMedia: {
        facebook: "https://facebook.com/tiendapremium",
        instagram: "https://instagram.com/tiendapremium",
        whatsapp: "+584121234567",
      },
      contactInfo: {
        email: "contacto@tiendapremium.com",
        phone: "+58 412-1234567",
        address: {
          street: "Calle Principal 123",
          city: "Caracas",
          state: "Miranda",
          country: "Venezuela",
        },
      },
    });

    await storefront.save();
  }

  private async createServicesStorefront(tenantId: any) {
    this.logger.log("Creating services storefront config...");

    const storefront = new this.storefrontModel({
      tenantId,
      domain: "salon-belleza.localhost",
      isActive: true,
      theme: {
        primaryColor: "#EC4899",
        secondaryColor: "#8B5CF6",
      },
      templateType: "services",
      seo: {
        title: "Salón de Belleza Elegance",
        description: "Transformamos tu belleza con estilo y profesionalismo",
        keywords: ["salon", "belleza", "estética", "cabello", "manicure"],
      },
      socialMedia: {
        facebook: "https://facebook.com/salonelegance",
        instagram: "https://instagram.com/salonelegance",
        whatsapp: "+584127654321",
      },
      contactInfo: {
        email: "info@salonelegance.com",
        phone: "+58 412-7654321",
        address: {
          street: "Av. Principal, Centro Comercial Plaza, Local 15",
          city: "Caracas",
          state: "Miranda",
          country: "Venezuela",
        },
      },
    });

    await storefront.save();
  }

  private async createEcommerceProducts(tenantId: any) {
    this.logger.log("Creating e-commerce products...");

    const products = [
      {
        name: "Harina de Maíz Premium",
        description: "Harina de maíz precocida de la más alta calidad",
        category: "Granos",
        price: 5.5,
        cost: 3.0,
        stock: 100,
        sku: "HARINA-001",
        barcode: "7501234567890",
        tenantId,
        isActive: true,
      },
      {
        name: "Aceite de Girasol",
        description: "Aceite vegetal 100% puro",
        category: "Aceites",
        price: 8.75,
        cost: 5.0,
        stock: 50,
        sku: "ACEITE-001",
        barcode: "7501234567891",
        tenantId,
        isActive: true,
      },
      {
        name: "Arroz Blanco",
        description: "Arroz de grano largo, primera calidad",
        category: "Granos",
        price: 3.25,
        cost: 2.0,
        stock: 200,
        sku: "ARROZ-001",
        barcode: "7501234567892",
        tenantId,
        isActive: true,
      },
      {
        name: "Pasta Larga",
        description: "Pasta tipo espagueti, 500g",
        category: "Pastas",
        price: 2.5,
        cost: 1.5,
        stock: 150,
        sku: "PASTA-001",
        barcode: "7501234567893",
        tenantId,
        isActive: true,
      },
      {
        name: "Azúcar Refinada",
        description: "Azúcar blanca refinada, 1kg",
        category: "Endulzantes",
        price: 4.0,
        cost: 2.5,
        stock: 80,
        sku: "AZUCAR-001",
        barcode: "7501234567894",
        tenantId,
        isActive: true,
      },
      {
        name: "Café Molido",
        description: "Café 100% arábica, tostado y molido",
        category: "Bebidas",
        price: 12.5,
        cost: 8.0,
        stock: 60,
        sku: "CAFE-001",
        barcode: "7501234567895",
        tenantId,
        isActive: true,
      },
    ];

    await this.productModel.insertMany(products);
  }

  private async createServicesProducts(tenantId: any) {
    this.logger.log("Creating services (as products)...");

    const services = [
      {
        name: "Corte de Cabello",
        description: "Corte profesional adaptado a tu estilo personal",
        category: "Cabello",
        price: 25.0,
        cost: 10.0,
        stock: 999, // Servicios ilimitados
        sku: "SERV-CORTE-001",
        tenantId,
        isActive: true,
      },
      {
        name: "Coloración",
        description: "Tintes y mechas con productos de alta calidad",
        category: "Cabello",
        price: 60.0,
        cost: 30.0,
        stock: 999,
        sku: "SERV-COLOR-001",
        tenantId,
        isActive: true,
      },
      {
        name: "Manicure & Pedicure",
        description: "Cuidado completo de manos y pies",
        category: "Uñas",
        price: 35.0,
        cost: 15.0,
        stock: 999,
        sku: "SERV-MANI-001",
        tenantId,
        isActive: true,
      },
      {
        name: "Tratamiento Facial",
        description: "Limpieza profunda y rejuvenecimiento facial",
        category: "Estética",
        price: 45.0,
        cost: 20.0,
        stock: 999,
        sku: "SERV-FACIAL-001",
        tenantId,
        isActive: true,
      },
      {
        name: "Maquillaje Profesional",
        description: "Maquillaje para eventos especiales",
        category: "Estética",
        price: 50.0,
        cost: 25.0,
        stock: 999,
        sku: "SERV-MAKEUP-001",
        tenantId,
        isActive: true,
      },
      {
        name: "Masaje Relajante",
        description: "Masajes terapéuticos para tu bienestar",
        category: "Spa",
        price: 40.0,
        cost: 18.0,
        stock: 999,
        sku: "SERV-MASAJE-001",
        tenantId,
        isActive: true,
      },
    ];

    await this.productModel.insertMany(services);
  }
}
