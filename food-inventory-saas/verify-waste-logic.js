require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const bcrypt = require('bcrypt');

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const USER_ID = '68db6f617435a342fafcc71c'; // Jualfel Santamaría
// Using a valid existing tenant from list-tenants output
const TENANT_ID = '6962b024c96f2d4a2370ebe4'; // Savage Restaurant
const NEW_PASSWORD = 'password123';

async function verifyWasteLogic() {
    let connection;
    try {
        // 1. Reset Password and Assign Roles/Tenant
        console.log('🔄 Conectando a MongoDB para actualizar usuario...');
        connection = await mongoose.connect(process.env.MONGODB_URI);

        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
        const User = connection.connection.collection('users');

        await User.updateOne(
            { _id: new mongoose.Types.ObjectId(USER_ID) },
            {
                $set: {
                    password: hashedPassword,
                    isActive: true,
                    isVerified: true,
                    tenantId: new mongoose.Types.ObjectId(TENANT_ID), // Assign to valid tenant
                    roles: ['admin'],
                    permissions: [
                        'inventory_read',
                        'inventory_write',
                        'inventory_create',
                        'inventory_update',
                        'inventory_delete',
                        'waste_read',
                        'waste_write',
                        'dashboard_read'
                    ]
                }
            }
        );
        console.log('✅ Usuario actualizado: Contraseña reset, Tenant asignado y Rol admin.');
        await connection.disconnect();

        // 2. Login
        console.log('🔐 Iniciando sesión...');
        const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
            email: 'studiolimbicode@gmail.com',
            password: NEW_PASSWORD
        });

        const token = loginRes.data.accessToken || loginRes.data.token || (loginRes.data.data && loginRes.data.data.accessToken);
        if (!token) throw new Error('Token no encontrado');

        const axiosConfig = {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': TENANT_ID,
                'Content-Type': 'application/json'
            }
        };
        console.log('✅ Login exitoso.');

        // 3. Find a Product with Stock
        console.log('📦 Buscando producto con inventario (limit=5)...');
        const inventoryRes = await axios.get(`${API_URL}/api/v1/inventory?limit=5`, axiosConfig);
        const items = inventoryRes.data.data || inventoryRes.data;

        console.log(`📋 Encontrados ${items.length} items.`);

        const targetItem = items.find(i => i.availableQuantity > 5);
        if (!targetItem) {
            console.error('❌ No se encontró un producto con suficiente stock (>5) para la prueba.');
            console.log('Items encontrados:', items.map(i => `${i.productName} (${i.availableQuantity})`));
            return;
        }

        const initialStock = targetItem.availableQuantity;
        const productId = targetItem.productId._id || targetItem.productId;
        const productName = targetItem.productName || targetItem.productId.name || 'Desconocido';

        console.log(`🎯 Producto seleccionado: ${productName}`);
        console.log(`🆔 ID: ${productId}`);
        console.log(`📊 Stock inicial: ${initialStock}`);

        // 4. Create Waste Entry
        console.log('🗑️ Creando entrada de merma (Cantidad: 1)...');
        const wasteData = {
            productId: productId,
            quantity: 1,
            unit: 'unidad',
            reason: 'spoilage',
            notes: 'Verificación automática de antigravity',
            wasteDate: new Date().toISOString()
        };

        await axios.post(`${API_URL}/api/v1/waste`, wasteData, axiosConfig);
        console.log('✅ Entrada de merma creada.');

        // 5. Verify Stock Deduction
        console.log('🔍 Verificando nuevo stock...');
        // Fetch specific item again
        const verifyRes = await axios.get(`${API_URL}/api/v1/inventory/${targetItem._id}`, axiosConfig);
        const verifyItem = verifyRes.data.data || verifyRes.data;

        if (!verifyItem) {
            console.error('❌ No se pudo encontrar el item de inventario para verificar.');
            return;
        }

        const newStock = verifyItem.availableQuantity;
        console.log(`📊 Stock final: ${newStock}`);

        if (newStock === initialStock - 1) {
            console.log('✨ ÉXITO: El stock se descontó correctamente.');
        } else {
            console.error(`❌ FALLO: El stock no se descontó correctamente. Esperado: ${initialStock - 1}, Actual: ${newStock}`);
        }

    } catch (error) {
        console.error('❌ Error en la verificación:', error.message);
        if (error.response) {
            console.error('Detalles de respuesta:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

verifyWasteLogic();
