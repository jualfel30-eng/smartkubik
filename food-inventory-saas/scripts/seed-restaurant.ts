import { connect, disconnect, model, Types } from 'mongoose';
import { ModifierGroup, ModifierGroupSchema } from '../src/schemas/modifier-group.schema';
import { Modifier, ModifierSchema } from '../src/schemas/modifier.schema';
import { Table, TableSchema } from '../src/schemas/table.schema';
import { Product, ProductSchema } from '../src/schemas/product.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';

type GroupDefinition = {
  name: string;
  description?: string;
  selectionType: 'single' | 'multiple';
  minSelections?: number;
  maxSelections?: number;
  required: boolean;
  sortOrder: number;
  modifiers: Array<{
    name: string;
    description?: string;
    priceAdjustment: number;
  }>;
};

type ProductDefinition = {
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  basePrice: number;
  costPrice: number;
  barcode: string;
  isPerishable: boolean;
  taxCategory: string;
  groups: string[];
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
const TENANT_CODE = 'RESTAURANT_DEMO';

async function seedRestaurantData() {
  await connect(MONGODB_URI);
  console.log(`✅ Connected to database at ${MONGODB_URI}`);

  const TenantModel = model(Tenant.name, TenantSchema);
  const ModifierGroupModel = model(ModifierGroup.name, ModifierGroupSchema);
  const ModifierModel = model(Modifier.name, ModifierSchema);
  const TableModel = model(Table.name, TableSchema);
  const ProductModel = model(Product.name, ProductSchema);

  const tenant = await resolveTenant(TenantModel);
  console.log(`🏢 Using tenant: ${tenant.name} (${tenant._id.toString()})`);

  const modifierGroups = await seedModifierGroups(ModifierGroupModel, ModifierModel, tenant._id);
  const tables = await seedTables(TableModel, tenant._id);
  const products = await seedProducts(ProductModel, tenant._id);

  await assignGroupsToProducts(ModifierGroupModel, modifierGroups, products);

  console.log('');
  console.log('🎉 Restaurant demo data ready!');
  console.log(` - Modifier groups created: ${modifierGroups.length}`);
  console.log(` - Tables created: ${tables.length}`);
  console.log(` - Products created: ${products.length}`);
}

async function resolveTenant(TenantModel: ReturnType<typeof model>) {
  if (process.env.RESTAURANT_TENANT_ID) {
    const tenant = await TenantModel.findById(process.env.RESTAURANT_TENANT_ID);
    if (!tenant) {
      throw new Error(`Tenant with id ${process.env.RESTAURANT_TENANT_ID} not found`);
    }

    return tenant;
  }

  const existingTenant = await TenantModel.findOne({ code: TENANT_CODE });
  if (existingTenant) {
    return existingTenant;
  }

  const tenant = new TenantModel({
    code: TENANT_CODE,
    name: 'Restaurante Demo',
    description: 'Tenant de demostración para el vertical de restaurantes',
    businessType: 'restaurant',
    vertical: 'FOOD_SERVICE',
    contactInfo: {
      email: 'demo@restaurante.com',
      phone: '+58 424-0000000',
      address: {
        street: 'Av. Principal #123',
        city: 'Caracas',
        state: 'Distrito Capital',
        country: 'Venezuela',
      },
    },
    taxInfo: {
      rif: 'J-12345678-9',
      businessName: 'Restaurante Demo C.A.',
      isRetentionAgent: false,
      taxRegime: 'general',
    },
    enabledModules: {
      inventory: true,
      orders: true,
      customers: true,
      tables: true,
      kitchenDisplay: true,
      menuEngineering: true,
    },
    subscriptionPlan: 'trial',
    status: 'active',
    timezone: 'America/Caracas',
    language: 'es',
  });

  await tenant.save();
  console.log('🌱 Created demo tenant RESTAURANT_DEMO');
  return tenant;
}

async function seedModifierGroups(
  ModifierGroupModel: ReturnType<typeof model>,
  ModifierModel: ReturnType<typeof model>,
  tenantId: Types.ObjectId,
) {
  const groupDefinitions: GroupDefinition[] = [
    {
      name: 'Punto de Cocción',
      description: 'Selecciona el punto de cocción ideal para las carnes',
      selectionType: 'single',
      minSelections: 1,
      maxSelections: 1,
      required: true,
      sortOrder: 1,
      modifiers: [
        { name: 'Rojo Inglés', description: 'Sellado, casi crudo en el centro', priceAdjustment: 0 },
        { name: 'Término Medio', description: 'Sella exterior, centro rosado', priceAdjustment: 0 },
        { name: 'Tres Cuartos', description: 'Centro ligeramente rosado', priceAdjustment: 0 },
        { name: 'Bien Cocido', description: 'Completamente cocido', priceAdjustment: 0 },
      ],
    },
    {
      name: 'Toppings',
      description: 'Personaliza tus platos con toppings adicionales',
      selectionType: 'multiple',
      minSelections: 0,
      maxSelections: 3,
      required: false,
      sortOrder: 2,
      modifiers: [
        { name: 'Queso Cheddar', priceAdjustment: 1.5 },
        { name: 'Tocino Ahumado', priceAdjustment: 2 },
        { name: 'Aguacate Fresco', priceAdjustment: 2.5 },
        { name: 'Cebolla Caramelizada', priceAdjustment: 1 },
        { name: 'Huevo Frito', priceAdjustment: 1.8 },
      ],
    },
    {
      name: 'Bebidas',
      description: 'Elige el tamaño para acompañar tu orden',
      selectionType: 'single',
      minSelections: 1,
      maxSelections: 1,
      required: true,
      sortOrder: 3,
      modifiers: [
        { name: 'Pequeña (12 oz)', priceAdjustment: 0 },
        { name: 'Mediana (16 oz)', priceAdjustment: 0.5 },
        { name: 'Grande (20 oz)', priceAdjustment: 1 },
      ],
    },
  ];

  const createdGroups = [];
  for (const group of groupDefinitions) {
    const groupDoc = await ModifierGroupModel.findOneAndUpdate(
      { tenantId, name: group.name },
      {
        $set: {
          description: group.description,
          selectionType: group.selectionType,
          minSelections: group.minSelections ?? 0,
          maxSelections: group.maxSelections,
          required: group.required,
          available: true,
          sortOrder: group.sortOrder,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ModifierModel.deleteMany({ tenantId, groupId: groupDoc._id });

    const modifierPayload = group.modifiers.map((modifier, index) => ({
      name: modifier.name,
      description: modifier.description,
      priceAdjustment: modifier.priceAdjustment,
      available: true,
      sortOrder: index + 1,
      groupId: groupDoc._id,
      tenantId,
      isDeleted: false,
    }));

    if (modifierPayload.length > 0) {
      await ModifierModel.insertMany(modifierPayload);
    }

    createdGroups.push(groupDoc);
  }

  console.log(`🍽️  Modifier groups ready (${createdGroups.length})`);
  return createdGroups;
}

async function seedTables(TableModel: ReturnType<typeof model>, tenantId: Types.ObjectId) {
  const tableData = [
    { tableNumber: 'T1', section: 'Terraza', shape: 'round', capacity: 2, position: { x: 2, y: 1 } },
    { tableNumber: 'T2', section: 'Terraza', shape: 'round', capacity: 2, position: { x: 4, y: 1 } },
    { tableNumber: 'T3', section: 'Terraza', shape: 'square', capacity: 4, position: { x: 6, y: 1 } },
    { tableNumber: 'T4', section: 'Terraza', shape: 'square', capacity: 4, position: { x: 8, y: 1 } },
    { tableNumber: 'T5', section: 'Terraza', shape: 'rectangle', capacity: 6, position: { x: 10, y: 1 } },
    { tableNumber: 'I1', section: 'Interior', shape: 'square', capacity: 2, position: { x: 2, y: 4 } },
    { tableNumber: 'I2', section: 'Interior', shape: 'square', capacity: 2, position: { x: 4, y: 4 } },
    { tableNumber: 'I3', section: 'Interior', shape: 'square', capacity: 4, position: { x: 6, y: 4 } },
    { tableNumber: 'I4', section: 'Interior', shape: 'square', capacity: 4, position: { x: 8, y: 4 } },
    { tableNumber: 'I5', section: 'Interior', shape: 'rectangle', capacity: 6, position: { x: 10, y: 4 } },
    { tableNumber: 'V1', section: 'VIP', shape: 'round', capacity: 4, position: { x: 4, y: 7 } },
    { tableNumber: 'V2', section: 'VIP', shape: 'round', capacity: 4, position: { x: 6, y: 7 } },
    { tableNumber: 'V3', section: 'VIP', shape: 'rectangle', capacity: 6, position: { x: 8, y: 7 } },
  ];

  const tableNumbers = tableData.map((t) => t.tableNumber);
  await TableModel.deleteMany({ tenantId, tableNumber: { $in: tableNumbers } });

  const payload = tableData.map((table) => ({
    tableNumber: table.tableNumber,
    section: table.section,
    position: table.position,
    shape: table.shape,
    minCapacity: Math.min(2, table.capacity),
    maxCapacity: table.capacity,
    status: 'available',
    tenantId,
    isDeleted: false,
  }));

  await TableModel.insertMany(payload);
  console.log(`🪑 Tables created (${payload.length})`);
  return payload;
}

async function seedProducts(ProductModel: ReturnType<typeof model>, tenantId: Types.ObjectId) {
  const productDefinitions: ProductDefinition[] = [
    {
      sku: 'REST-HAMB-CLAS',
      name: 'Hamburguesa Clásica',
      category: 'Alimentos',
      subcategory: 'Hamburguesas',
      brand: 'Restaurante Demo',
      basePrice: 8.5,
      costPrice: 3.8,
      barcode: '890000000001',
      isPerishable: true,
      taxCategory: 'standard',
      groups: ['Punto de Cocción', 'Toppings'],
    },
    {
      sku: 'REST-HAMB-BBQ',
      name: 'Hamburguesa BBQ',
      category: 'Alimentos',
      subcategory: 'Hamburguesas',
      brand: 'Restaurante Demo',
      basePrice: 9.5,
      costPrice: 4.2,
      barcode: '890000000002',
      isPerishable: true,
      taxCategory: 'standard',
      groups: ['Punto de Cocción', 'Toppings'],
    },
    {
      sku: 'REST-PIZZA-MARG',
      name: 'Pizza Margarita Artesanal',
      category: 'Alimentos',
      subcategory: 'Pizzas',
      brand: 'Restaurante Demo',
      basePrice: 11.9,
      costPrice: 5.5,
      barcode: '890000000003',
      isPerishable: true,
      taxCategory: 'standard',
      groups: ['Toppings'],
    },
    {
      sku: 'REST-BEB-ART',
      name: 'Refresco Artesanal',
      category: 'Bebidas',
      subcategory: 'Refrescos',
      brand: 'Restaurante Demo',
      basePrice: 3.5,
      costPrice: 1.2,
      barcode: '890000000004',
      isPerishable: false,
      taxCategory: 'standard',
      groups: ['Bebidas'],
    },
  ];

  await ProductModel.deleteMany({ tenantId, sku: { $in: productDefinitions.map((p) => p.sku) } });

  const createdProducts = [];
  for (const product of productDefinitions) {
    const productDoc = new ProductModel({
      sku: product.sku,
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      description: `${product.name} - producto de demostración para el módulo de restaurante`,
      tags: ['restaurante', 'demo', 'seed'],
      unitOfMeasure: 'unidad',
      isSoldByWeight: false,
      hasMultipleSellingUnits: false,
      sellingUnits: [],
      variants: [
        {
          name: `${product.name} Base`,
          sku: `${product.sku}-VAR`,
          barcode: product.barcode,
          unit: 'unidad',
          unitSize: 1,
          basePrice: product.basePrice,
          costPrice: product.costPrice,
          isActive: true,
        },
      ],
      suppliers: [],
      isPerishable: product.isPerishable,
      ivaApplicable: true,
      igtfExempt: false,
      taxCategory: product.taxCategory,
      pricingRules: {
        cashDiscount: 0,
        cardSurcharge: 0,
        usdPrice: product.basePrice,
        minimumMargin: 0.2,
        maximumDiscount: 0.3,
      },
      inventoryConfig: {
        trackLots: false,
        trackExpiration: product.isPerishable,
        minimumStock: 10,
        maximumStock: 200,
        reorderPoint: 20,
        reorderQuantity: 40,
        fefoEnabled: product.isPerishable,
      },
      isActive: true,
      tenantId,
    });

    await productDoc.save();
    createdProducts.push({
      ...product,
      _id: productDoc._id as Types.ObjectId,
    });
  }

  console.log(`🥘 Products created (${createdProducts.length})`);
  return createdProducts;
}

async function assignGroupsToProducts(
  ModifierGroupModel: ReturnType<typeof model>,
  groups: any[],
  products: Array<ProductDefinition & { _id: Types.ObjectId }>,
) {
  const productsByGroup = groups.map((group) => {
    const productIds = products
      .filter((product) => product.groups.includes(group.name))
      .map((product) => product._id);

    return { groupId: group._id, productIds };
  });

  for (const entry of productsByGroup) {
    await ModifierGroupModel.updateOne(
      { _id: entry.groupId },
      { $set: { applicableProducts: entry.productIds } },
    );
  }
}

seedRestaurantData()
  .then(async () => {
    await disconnect();
    console.log('✅ Restaurant seeding completed');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Error seeding restaurant data:', error);
    await disconnect();
    process.exit(1);
  });
