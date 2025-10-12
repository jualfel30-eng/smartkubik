// Script para crear datos de prueba del módulo restaurant
// Ejecutar: node scripts/seed-restaurant-data.js [email]
// Ejemplo: node scripts/seed-restaurant-data.js admin@earlyadopter.com

const { MongoClient, ObjectId } = require('mongodb');

async function seedRestaurantData(userEmail) {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('food-inventory-saas'); // Base de datos correcta

  console.log('🔍 Buscando usuario y tenant...');
  console.log(`   Email: ${userEmail}`);

  // 1. Buscar usuario y tenant
  const user = await db.collection('users').findOne({
    email: userEmail
  });

  if (!user) {
    console.log('❌ Usuario no encontrado');
    console.log('\n📋 Usuarios disponibles:');
    const users = await db.collection('users').find({}, { email: 1, _id: 0 }).toArray();
    users.forEach(u => console.log(`   - ${u.email}`));
    await client.close();
    return;
  }

  console.log('✅ Usuario encontrado:', user.email);
  const tenantId = user.tenantId;

  if (!tenantId) {
    console.log('❌ Usuario no tiene tenant asignado');
    await client.close();
    return;
  }

  // 2. Verificar tenant
  const tenant = await db.collection('tenants').findOne({ _id: tenantId });
  console.log(`✅ Tenant encontrado: ${tenant.name}`);

  // 3. Habilitar módulo restaurant
  console.log('🔧 Habilitando módulo restaurant...');
  await db.collection('tenants').updateOne(
    { _id: tenantId },
    {
      $set: {
        'enabledModules.restaurant': true,
        'enabledModules.retail': true
      }
    }
  );
  console.log('✅ Módulo restaurant habilitado');

  // 4. Verificar módulos
  const updatedTenant = await db.collection('tenants').findOne({ _id: tenantId });
  console.log('📊 Módulos habilitados:', updatedTenant.enabledModules);

  // 5. Crear mesas (si no existen)
  const existingTables = await db.collection('tables').countDocuments({ tenantId });

  if (existingTables === 0) {
    console.log('🪑 Creando mesas...');
    const tables = [
      // Área Principal
      { number: 1, capacity: 4, section: 'Principal', status: 'available', tenantId, isDeleted: false },
      { number: 2, capacity: 4, section: 'Principal', status: 'available', tenantId, isDeleted: false },
      { number: 3, capacity: 2, section: 'Principal', status: 'available', tenantId, isDeleted: false },
      { number: 4, capacity: 2, section: 'Principal', status: 'available', tenantId, isDeleted: false },
      { number: 5, capacity: 6, section: 'Principal', status: 'available', tenantId, isDeleted: false },

      // Terraza
      { number: 6, capacity: 4, section: 'Terraza', status: 'available', tenantId, isDeleted: false },
      { number: 7, capacity: 4, section: 'Terraza', status: 'available', tenantId, isDeleted: false },
      { number: 8, capacity: 2, section: 'Terraza', status: 'available', tenantId, isDeleted: false },

      // VIP
      { number: 9, capacity: 8, section: 'VIP', status: 'available', tenantId, isDeleted: false },
      { number: 10, capacity: 6, section: 'VIP', status: 'available', tenantId, isDeleted: false },

      // Barra
      { number: 11, capacity: 2, section: 'Barra', status: 'available', tenantId, isDeleted: false },
      { number: 12, capacity: 2, section: 'Barra', status: 'available', tenantId, isDeleted: false },
    ];

    await db.collection('tables').insertMany(tables);
    console.log(`✅ ${tables.length} mesas creadas`);
  } else {
    console.log(`ℹ️  Ya existen ${existingTables} mesas`);
  }

  // 6. Crear modifier groups (si no existen)
  const existingModifierGroups = await db.collection('modifiergroups').countDocuments({ tenantId });

  if (existingModifierGroups === 0) {
    console.log('🔧 Creando grupos de modificadores...');

    const modifierGroups = [
      {
        name: 'Punto de Cocción',
        selectionType: 'single',
        required: false,
        maxSelections: 1,
        applicableCategories: ['Carnes', 'Hamburguesas'],
        modifiers: [
          { name: 'Término Rojo', priceAdjustment: 0 },
          { name: 'Término Medio', priceAdjustment: 0 },
          { name: 'Bien Cocido', priceAdjustment: 0 },
        ],
        tenantId,
        isDeleted: false,
      },
      {
        name: 'Extras para Hamburguesa',
        selectionType: 'multiple',
        required: false,
        maxSelections: 5,
        applicableCategories: ['Hamburguesas'],
        modifiers: [
          { name: 'Queso Extra', priceAdjustment: 1.5 },
          { name: 'Tocineta', priceAdjustment: 2.0 },
          { name: 'Huevo Frito', priceAdjustment: 1.0 },
          { name: 'Aguacate', priceAdjustment: 1.5 },
          { name: 'Champiñones', priceAdjustment: 1.5 },
        ],
        tenantId,
        isDeleted: false,
      },
      {
        name: 'Tipo de Pasta',
        selectionType: 'single',
        required: true,
        maxSelections: 1,
        applicableCategories: ['Pastas'],
        modifiers: [
          { name: 'Spaghetti', priceAdjustment: 0 },
          { name: 'Penne', priceAdjustment: 0 },
          { name: 'Fettuccine', priceAdjustment: 0 },
          { name: 'Ravioli', priceAdjustment: 2.0 },
        ],
        tenantId,
        isDeleted: false,
      },
      {
        name: 'Acompañamiento',
        selectionType: 'single',
        required: false,
        maxSelections: 1,
        applicableCategories: ['Platos Principales'],
        modifiers: [
          { name: 'Papas Fritas', priceAdjustment: 0 },
          { name: 'Arroz', priceAdjustment: 0 },
          { name: 'Ensalada', priceAdjustment: 0 },
          { name: 'Vegetales al Vapor', priceAdjustment: 1.0 },
          { name: 'Yuca Frita', priceAdjustment: 0.5 },
        ],
        tenantId,
        isDeleted: false,
      },
      {
        name: 'Temperatura de Bebida',
        selectionType: 'single',
        required: false,
        maxSelections: 1,
        applicableCategories: ['Bebidas'],
        modifiers: [
          { name: 'Con Hielo', priceAdjustment: 0 },
          { name: 'Sin Hielo', priceAdjustment: 0 },
          { name: 'Extra Hielo', priceAdjustment: 0 },
        ],
        tenantId,
        isDeleted: false,
      },
    ];

    await db.collection('modifiergroups').insertMany(modifierGroups);
    console.log(`✅ ${modifierGroups.length} grupos de modificadores creados`);
  } else {
    console.log(`ℹ️  Ya existen ${existingModifierGroups} grupos de modificadores`);
  }

  // 7. Actualizar productos existentes con categorías apropiadas
  console.log('📦 Actualizando categorías de productos...');

  const sampleProducts = await db.collection('products')
    .find({ tenantId, isDeleted: false })
    .limit(10)
    .toArray();

  if (sampleProducts.length > 0) {
    const categories = ['Hamburguesas', 'Carnes', 'Pastas', 'Platos Principales', 'Bebidas'];

    let updated = 0;
    for (let i = 0; i < sampleProducts.length && i < categories.length; i++) {
      await db.collection('products').updateOne(
        { _id: sampleProducts[i]._id },
        { $set: { category: categories[i] } }
      );
      updated++;
    }

    console.log(`✅ Categorías asignadas a ${updated} productos`);
  } else {
    console.log('⚠️  No se encontraron productos para asignar categorías');
  }

  console.log('\n🎉 ¡Seed data completado!');
  console.log('\n📋 Resumen:');
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Módulo restaurant: ✅ Habilitado`);
  console.log(`   Mesas: ${await db.collection('tables').countDocuments({ tenantId })}`);
  console.log(`   Grupos de modificadores: ${await db.collection('modifiergroups').countDocuments({ tenantId })}`);
  console.log(`   Productos: ${await db.collection('products').countDocuments({ tenantId, isDeleted: false })}`);

  console.log('\n🚀 Próximos pasos:');
  console.log('   1. Reinicia el servidor frontend:');
  console.log('      cd food-inventory-admin && npm run dev');
  console.log('   2. Haz hard refresh en el navegador:');
  console.log('      Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)');
  console.log('   3. Inicia sesión con: ' + userEmail);
  console.log('   4. Verifica que veas las nuevas secciones del menú');
  console.log('   5. Ve a "Gestión de Mesas" para ver el floor plan');

  await client.close();
}

// Obtener email del argumento o usar default
const userEmail = process.argv[2] || 'admin@earlyadopter.com';

console.log('🚀 Seed Restaurant Data Script\n');

seedRestaurantData(userEmail).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
