/**
 * Verificar password hash y comparar con el password enviado
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function verifyPassword() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    const user = await User.findOne({ email: 'admin@earlyadopter.com' }).lean();

    if (!user) {
      console.log('❌ Usuario NO encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   email: ${user.email}`);
    console.log(`   password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'N/A'}`);
    console.log('');

    if (!user.password) {
      console.log('❌ El usuario NO tiene password hash guardado\n');
      return;
    }

    console.log('🔐 Comparando password "admin1234!" con el hash...\n');

    const isMatch = await bcrypt.compare('admin1234!', user.password);

    if (isMatch) {
      console.log('✅ Password CORRECTO - "admin1234!" coincide con el hash\n');
    } else {
      console.log('❌ Password INCORRECTO - "admin1234!" NO coincide con el hash\n');
      console.log('💡 El password correcto es DIFERENTE a "admin1234!"\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

verifyPassword();
