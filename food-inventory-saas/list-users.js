require('dotenv').config();
const mongoose = require('mongoose');

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Conectado a MongoDB');

        const User = mongoose.connection.collection('users');
        const users = await User.find({}).limit(10).toArray();

        console.log(`\n📋 Usuarios encontrados: ${users.length}\n`);

        for (const user of users) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Nombre:', user.firstName, user.lastName);
            console.log('Email:', user.email);
            console.log('ID:', user._id);
            console.log('Tenant ID:', user.tenantId);
            console.log('Roles:', user.roles);
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Desconectado de MongoDB');
    }
}

listUsers();
