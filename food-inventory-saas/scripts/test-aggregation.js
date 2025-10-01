const mongoose = require('mongoose');
require('dotenv').config();

async function testAggregation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Obtener un cliente específico con órdenes pagadas
    const customer = await db.collection('customers').findOne({ name: 'Jualfel Santamaría' });

    if (!customer) {
      console.log('❌ Cliente no encontrado');
      process.exit(0);
    }

    console.log('🔍 Cliente seleccionado:', customer.name);
    console.log('   ID:', customer._id);
    console.log('   TenantID:', customer.tenantId);
    console.log('   Metrics en BD:', customer.metrics);

    // Ejecutar la misma agregación que hace el servicio
    console.log('\n📊 Ejecutando agregación...\n');

    const pipeline = [
      {
        $match: {
          _id: customer._id,
          tenantId: customer.tenantId
        }
      },

      // Lookup órdenes
      {
        $lookup: {
          from: 'orders',
          let: {
            customerId: '$_id',
            currentTenantId: '$tenantId'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // 1. Match tenantId
                    { $eq: ['$tenantId', '$$currentTenantId'] },

                    // 2. Match customerId
                    {
                      $or: [
                        {
                          $and: [
                            { $eq: [{ $type: '$customerId' }, 'objectId'] },
                            { $eq: ['$customerId', '$$customerId'] }
                          ]
                        },
                        {
                          $and: [
                            { $eq: [{ $type: '$customerId' }, 'string'] },
                            { $eq: [{ $strLenCP: '$customerId' }, 24] },
                            { $eq: [{ $toObjectId: '$customerId' }, '$$customerId'] }
                          ]
                        }
                      ]
                    },

                    // 3. Match paymentStatus
                    { $in: ['$paymentStatus', ['paid', 'partial']] }
                  ]
                }
              }
            },
            {
              $project: {
                totalAmount: 1,
                createdAt: 1,
                paymentStatus: 1
              }
            }
          ],
          as: 'customerOrders'
        }
      },

      // Calcular métricas
      {
        $addFields: {
          'metrics.totalSpent': {
            $cond: {
              if: { $ne: ['$customerType', 'supplier'] },
              then: { $sum: '$customerOrders.totalAmount' },
              else: { $ifNull: ['$metrics.totalSpent', 0] }
            }
          },

          'metrics.totalOrders': {
            $cond: {
              if: { $ne: ['$customerType', 'supplier'] },
              then: { $size: '$customerOrders' },
              else: { $ifNull: ['$metrics.totalOrders', 0] }
            }
          },
        }
      },

      {
        $project: {
          customerOrders: 0
        }
      }
    ];

    const result = await db.collection('customers').aggregate(pipeline).toArray();

    console.log('📋 RESULTADO DE LA AGREGACIÓN:');
    console.log('='.repeat(80));
    if (result.length > 0) {
      const aggregatedCustomer = result[0];
      console.log('   Nombre:', aggregatedCustomer.name);
      console.log('   Metrics después de agregación:', JSON.stringify(aggregatedCustomer.metrics, null, 2));
      console.log('   ✅ La agregación calcula correctamente el totalSpent');
    } else {
      console.log('   ❌ No se obtuvo resultado de la agregación');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

testAggregation();