#!/usr/bin/env node
/**
 * Migration Script: Backfill UserTenantMembership documents
 *
 * Usage:
 *   DRY_RUN=true node 2025-01-backfill-memberships.js
 *   node 2025-01-backfill-memberships.js --dry-run
 *
 * Requires environment variable MONGODB_URI pointing to the target database.
 */

/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');

const DRY_RUN =
  process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

const envPath = process.env.DOTENV_PATH
  ? path.resolve(process.env.DOTENV_PATH)
  : path.resolve(__dirname, '../../food-inventory-saas/.env');

try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: envPath });
} catch (error) {
  console.warn('No se pudo cargar el archivo .env automáticamente.', error);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    '❌ MONGODB_URI no está definido. Configura la variable de entorno y vuelve a ejecutar.',
  );
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    email: String,
    tenantId: mongoose.Schema.Types.ObjectId,
    role: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
  },
  { collection: 'users' },
);

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, default: 'active' },
    isDefault: { type: Boolean, default: false },
    permissionsCache: { type: [String], default: [] },
  },
  { collection: 'usertenantmemberships' },
);

const roleSchema = new mongoose.Schema(
  {
    name: String,
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  },
  { collection: 'roles' },
);

const permissionSchema = new mongoose.Schema(
  {
    name: String,
  },
  { collection: 'permissions' },
);

const User = mongoose.model('User', userSchema);
const Membership = mongoose.model(
  'UserTenantMembership',
  membershipSchema,
);
const Role = mongoose.model('Role', roleSchema);
const Permission = mongoose.model('Permission', permissionSchema);

async function resolvePermissionNames(roleDoc) {
  if (!roleDoc || !Array.isArray(roleDoc.permissions)) {
    return [];
  }

  const permissions = await Permission.find({
    _id: { $in: roleDoc.permissions },
  })
    .select('name')
    .lean()
    .exec();

  return permissions
    .map((permission) => permission?.name)
    .filter((name) => Boolean(name));
}

async function backfillMemberships() {
  console.log('🚀 Iniciando migración de UserTenantMembership...');
  console.log(`🔧 DRY_RUN=${DRY_RUN ? 'true' : 'false'}`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado a MongoDB');

  const users = await User.find({ tenantId: { $ne: null } })
    .select(['email', 'tenantId', 'role', 'isActive'])
    .lean()
    .exec();

  console.log(`🔍 Usuarios con tenant asociado: ${users.length}`);

  const stats = {
    processed: 0,
    created: 0,
    skippedExisting: 0,
    errors: 0,
  };

  const defaultTracker = new Map(); // userId -> boolean

  for (const user of users) {
    stats.processed += 1;
    const userId = user._id;
    const tenantId = user.tenantId;

    try {
      const existingMembership = await Membership.findOne({
        userId,
        tenantId,
      }).lean();

      if (existingMembership) {
        stats.skippedExisting += 1;
        continue;
      }

      const roleDoc = await Role.findById(user.role).lean();

      const permissionsCache = await resolvePermissionNames(roleDoc);

      const isDefault =
        defaultTracker.get(userId.toString()) !== true;

      if (!DRY_RUN) {
        await Membership.create({
          userId,
          tenantId,
          roleId: user.role,
          status: user.isActive ? 'active' : 'inactive',
          isDefault,
          permissionsCache,
        });
      }

      defaultTracker.set(userId.toString(), true);
      stats.created += 1;
    } catch (error) {
      stats.errors += 1;
      console.error(
        `❌ Error procesando usuario ${user.email} (${userId}):`,
        error.message,
      );
    }
  }

  console.log('📊 Resumen de la migración:');
  console.log(`   ➤ Usuarios procesados: ${stats.processed}`);
  console.log(`   ➤ Membresías creadas: ${stats.created}`);
  console.log(`   ➤ Membresías existentes (omitidas): ${stats.skippedExisting}`);
  console.log(`   ➤ Errores: ${stats.errors}`);

  await mongoose.disconnect();
  console.log('🔌 Conexión cerrada. Migración completada.');
}

backfillMemberships()
  .then(() => {
    if (DRY_RUN) {
      console.log('🧪 DRY RUN finalizado. No se realizaron cambios.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migración fallida:', error);
    process.exit(1);
  });
