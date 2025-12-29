#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 DIAGNÓSTICO: CUENTAS POR COBRAR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load environment variables
if [ -f "food-inventory-saas/.env" ]; then
    export $(cat food-inventory-saas/.env | grep -v '^#' | xargs)
fi

echo "📊 Conectando a MongoDB Atlas..."
echo "URI: ${MONGODB_URI:0:30}..."
echo ""

# 1. Check orders collection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  ÓRDENES TOTALES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mongosh "$MONGODB_URI" --quiet --eval "db.orders.countDocuments({})" 2>/dev/null
echo ""

# 2. Check orders with pending/partial payment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  ÓRDENES CON PAGOS PENDIENTES O PARCIALES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mongosh "$MONGODB_URI" --quiet --eval "
    const orders = db.orders.find({
        paymentStatus: { \$in: ['pending', 'partial'] }
    }).toArray();
    print('Total: ' + orders.length + ' órdenes');
    print('');
    orders.forEach(order => {
        print('📦 Orden #' + order.orderNumber);
        print('   Cliente: ' + order.customerName);
        print('   Total: $' + order.totalAmount);
        print('   Estado Pago: ' + order.paymentStatus);
        print('   Pagos (array length): ' + (order.payments ? order.payments.length : 0));
        print('---');
    });
" 2>/dev/null
echo ""

# 3. Check payments collection
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  PAGOS TOTALES EN LA COLECCIÓN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mongosh "$MONGODB_URI" --quiet --eval "db.payments.countDocuments({})" 2>/dev/null
echo ""

# 4. Check if payments have orderId reference
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  PAGOS CON REFERENCIA A ORDEN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mongosh "$MONGODB_URI" --quiet --eval "
    const paymentsWithOrder = db.payments.find({ orderId: { \$exists: true, \$ne: null } }).toArray();
    print('Total: ' + paymentsWithOrder.length + ' pagos con orderId');
    print('');
    paymentsWithOrder.slice(0, 5).forEach(payment => {
        print('💳 Payment ID: ' + payment._id);
        print('   Order ID: ' + payment.orderId);
        print('   Amount: $' + payment.amount);
        print('   Date: ' + payment.paymentDate);
        print('---');
    });
" 2>/dev/null
echo ""

# 5. Check customers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  CLIENTES TOTALES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mongosh "$MONGODB_URI" --quiet --eval "db.customers.countDocuments({})" 2>/dev/null
echo ""

# 6. Check tenants
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  TENANTS TOTALES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mongosh "$MONGODB_URI" --quiet --eval "
    const tenants = db.tenants.find({}).toArray();
    print('Total: ' + tenants.length + ' tenants');
    print('');
    tenants.forEach(tenant => {
        print('🏢 ' + tenant.name + ' (' + tenant._id + ')');
    });
" 2>/dev/null
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DIAGNÓSTICO COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
