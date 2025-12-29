#!/bin/bash

# Load environment variables
if [ -f "food-inventory-saas/.env" ]; then
    export $(cat food-inventory-saas/.env | grep -v '^#' | xargs)
fi

echo "🔍 Verificando configuración del tenant EARLYADOPTER..."
echo ""

mongosh "$MONGODB_URI" --quiet --eval "
    const tenant = db.tenants.findOne({ name: 'EarlyAdopter' });

    if (!tenant) {
        print('❌ Tenant EarlyAdopter NO encontrado');
    } else {
        print('✅ Tenant encontrado:');
        print('  _id: ' + tenant._id);
        print('  name: ' + tenant.name);
        print('  vertical: ' + tenant.vertical);
        print('  verticalProfile: ' + JSON.stringify(tenant.verticalProfile || {}));
        print('');
        print('  enabledModules:');
        print('    ' + JSON.stringify(tenant.enabledModules || {}, null, 2));
    }
" 2>/dev/null
