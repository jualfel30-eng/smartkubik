// food-inventory-saas/scripts/fix-customer-metrics.ts
import { connect, disconnect } from 'mongoose';
import { Customer, CustomerSchema } from '../src/schemas/customer.schema';
import { Order, OrderSchema } from '../src/schemas/order.schema';
import { model } from 'mongoose';

async function fixCustomerMetrics() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log('Connected to database');

  const CustomerModel = model(Customer.name, CustomerSchema);
  const OrderModel = model(Order.name, OrderSchema);

  console.log('Starting customer metrics fix...');

  const customers = await CustomerModel.find({});
  console.log(`Found ${customers.length} customers to update`);

  for (const customer of customers) {
    try {
      // Calcular métricas reales desde las órdenes
      const orders = await OrderModel.find({ customerId: customer._id });
      
      const metrics = {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        lastOrderDate: orders.length > 0 ? 
          new Date(Math.max(...orders.map(o => o.createdAt.getTime()))) : null,
        firstOrderDate: orders.length > 0 ? 
          new Date(Math.min(...orders.map(o => o.createdAt.getTime()))) : null
      };

      // Calcular tier
      let tier = 'nuevo';
      if (metrics.totalSpent >= 10000) tier = 'diamante';
      else if (metrics.totalSpent >= 5000) tier = 'oro';
      else if (metrics.totalSpent >= 2000) tier = 'plata';
      else if (metrics.totalSpent > 0) tier = 'bronce';

      // Actualizar cliente
      await CustomerModel.findByIdAndUpdate(customer._id, {
        metrics: metrics,
        tier: tier
      });

      console.log(`Updated ${customer.name}: totalSpent=${metrics.totalSpent}, tier=${tier}`);

    } catch (error) {
      console.error(`Error updating customer ${customer._id}:`, error);
    }
  }

  console.log('Customer metrics fix completed');
  await disconnect();
}

fixCustomerMetrics().catch(console.error);
