#!/bin/bash

# Load environment variables
if [ -f "food-inventory-saas/.env" ]; then
    export $(cat food-inventory-saas/.env | grep -v '^#' | xargs)
fi

echo "Verificando orden ORD-251002-182420-0203..."
echo ""

mongosh "$MONGODB_URI" --quiet --eval "
    const order = db.orders.findOne({ orderNumber: 'ORD-251002-182420-0203' });
    print('Orden encontrada:');
    print('  orderNumber: ' + order.orderNumber);
    print('  customerName: ' + order.customerName);
    print('  totalAmount: ' + order.totalAmount);
    print('  paidAmount: ' + order.paidAmount);
    print('  paymentStatus: ' + order.paymentStatus);
    print('  payments (array): ' + JSON.stringify(order.payments));
    print('  payments.length: ' + (order.payments ? order.payments.length : 'undefined'));
    print('');

    if (order.payments && order.payments.length > 0) {
        print('Buscando pagos vinculados...');
        order.payments.forEach((paymentId, index) => {
            const payment = db.payments.findOne({ _id: paymentId });
            if (payment) {
                print('  Payment ' + (index + 1) + ':');
                print('    _id: ' + payment._id);
                print('    amount: ' + payment.amount);
                print('    paymentDate: ' + payment.paymentDate);
            } else {
                print('  Payment ' + (index + 1) + ': NOT FOUND (ID: ' + paymentId + ')');
            }
        });
    } else {
        print('⚠️  No hay pagos vinculados en order.payments[]');
    }
" 2>/dev/null
