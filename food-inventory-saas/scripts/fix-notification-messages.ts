import { MongoClient, ObjectId } from 'mongodb';

/**
 * Reescribe `message` y `navigateTo` de notificaciones legacy.
 *
 * Estrategia: para cada notificación rota, intenta hidratar los datos reales
 * desde la colección fuente (payables, bankaccounts, billingdocuments,
 * payrollruns, employeeprofiles/customers) usando entityId. Si la entidad ya
 * no existe, usa lo poco que tenga el metadata.
 *
 * Ejecución:
 *   - Dry-run (default):  npx ts-node scripts/fix-notification-messages.ts
 *   - Aplicar cambios:    APPLY=true npx ts-node scripts/fix-notification-messages.ts
 *   - Aplicar y purgar:   APPLY=true PURGE_BROKEN=true npx ts-node scripts/fix-notification-messages.ts
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const APPLY = process.env.APPLY === 'true';
const PURGE_BROKEN = process.env.PURGE_BROKEN === 'true';

const formatDate = (value: any): string => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es');
};

const numberOr = (value: any, fallback = 0): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toObjectId = (id: any): ObjectId | null => {
    if (!id) return null;
    if (id instanceof ObjectId) return id;
    if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
    return null;
};

interface Fix {
    title?: string;
    message?: string;
    navigateTo?: string;
    metadata?: Record<string, any>;
}

async function rebuild(notification: any, db: any): Promise<Fix | null> {
    const meta = notification.metadata || {};
    const id = notification.entityId;
    const oid = toObjectId(id);
    const type = notification.type;

    switch (type) {
        case 'payable.due': {
            let payeeName = meta.payeeName || meta.supplierName;
            let amount = meta.totalAmount ?? meta.amount;
            let dueDate = meta.dueDate;
            let payableNumber = meta.payableNumber;

            if (oid) {
                const payable = await db.collection('payables').findOne({ _id: oid });
                if (payable) {
                    payeeName = payable.payeeName || payeeName;
                    amount = payable.totalAmount ?? amount;
                    dueDate = payable.dueDate || dueDate;
                    payableNumber = payable.payableNumber || payableNumber;
                }
            }

            if (!payeeName && (amount == null || amount === 0)) return null;
            const refNumber = payableNumber ? ` #${payableNumber}` : '';
            return {
                title: `Pago proximo a vencer${refNumber}`,
                message: `${payeeName || 'Proveedor'} - $${numberOr(amount).toFixed(2)} (Vence: ${formatDate(dueDate) || 'sin fecha'})`,
                navigateTo: id ? `/accounts-payable?id=${id}` : '/accounts-payable',
                metadata: { ...meta, payeeName, totalAmount: numberOr(amount), dueDate, payableNumber },
            };
        }

        case 'bank.low_balance': {
            let bankName = meta.bankName;
            let currentBalance = meta.currentBalance;
            let minimumBalance = meta.minimumBalance;
            let currency = meta.currency;

            if (oid) {
                const acc = await db.collection('bankaccounts').findOne({ _id: oid });
                if (acc) {
                    bankName = acc.bankName || bankName;
                    currentBalance = acc.currentBalance ?? currentBalance;
                    minimumBalance = acc.minimumBalance ?? minimumBalance;
                    currency = acc.currency || currency;
                }
            }

            if (!bankName) return null;
            const cur = currency || 'VES';
            return {
                title: `Saldo bajo: ${bankName}`,
                message: `Saldo actual: ${numberOr(currentBalance).toFixed(2)} ${cur} (Minimo: ${numberOr(minimumBalance).toFixed(2)})`,
                navigateTo: id ? `/bank-accounts?id=${id}` : '/bank-accounts',
                metadata: { ...meta, bankName, currentBalance: numberOr(currentBalance), minimumBalance: numberOr(minimumBalance), currency: cur },
            };
        }

        case 'billing.issued': {
            let docType = meta.type || meta.documentType;
            let documentNumber = meta.documentNumber;
            let customerName = meta.customerName;
            let total = meta.total ?? meta.amount;
            let currency = meta.currency;

            if (oid) {
                const doc = await db.collection('billingdocuments').findOne({ _id: oid });
                if (doc) {
                    docType = doc.type || docType;
                    documentNumber = doc.documentNumber || documentNumber;
                    customerName = doc.customer?.name || customerName;
                    total = doc.totals?.grandTotal ?? total;
                    currency = doc.totals?.currency || currency;
                }
            }

            const cur = currency || 'USD';
            const tot = numberOr(total);
            const totalLabel = cur === 'USD' ? `$${tot.toFixed(2)}` : `${tot.toFixed(2)} ${cur}`;
            return {
                title: `Documento emitido: ${docType || 'documento'} #${documentNumber || 's/n'}`,
                message: customerName ? `${customerName} - ${totalLabel}` : `Total: ${totalLabel}`,
                navigateTo: id ? `/billing/documents/${id}` : '/billing',
                metadata: { ...meta, type: docType, documentNumber, customerName, total: tot, currency: cur },
            };
        }

        case 'payroll.pending':
        case 'payroll.completed': {
            let label = meta.label;
            let periodStart = meta.periodStart;
            let periodEnd = meta.periodEnd;
            let totalEmployees = meta.totalEmployees ?? meta.employeeCount;
            let netPay = meta.netPay ?? meta.totalAmount;
            let currency = meta.currency;

            if (oid) {
                const run = await db.collection('payrollruns').findOne({ _id: oid });
                if (run) {
                    label = run.label || label;
                    periodStart = run.periodStart || periodStart;
                    periodEnd = run.periodEnd || periodEnd;
                    totalEmployees = run.totalEmployees ?? totalEmployees;
                    netPay = run.netPay ?? netPay;
                    currency = run.currency || currency;
                }
            }

            const cur = currency || 'VES';
            const emp = numberOr(totalEmployees);
            const np = numberOr(netPay);
            const periodLabel = label || `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;
            return {
                title:
                    type === 'payroll.pending'
                        ? 'Nomina pendiente de procesamiento'
                        : 'Nomina procesada exitosamente',
                message:
                    type === 'payroll.pending'
                        ? `${periodLabel} - ${emp} empleados - ${np.toFixed(2)} ${cur}`
                        : `${periodLabel} - ${np.toFixed(2)} ${cur} (${emp} empleados)`,
                navigateTo: id ? `/payroll/runs?id=${id}` : '/payroll/runs',
                metadata: { ...meta, label, periodStart, periodEnd, totalEmployees: emp, netPay: np, currency: cur },
            };
        }

        case 'employee.created': {
            let employeeName = meta.employeeName || [meta.firstName, meta.lastName].filter(Boolean).join(' ').trim();
            let position = meta.position;
            let department = meta.department;

            if (oid) {
                const profile = await db.collection('employeeprofiles').findOne({ _id: oid });
                if (profile) {
                    position = profile.position || position;
                    department = profile.department || department;
                    if (profile.customerId) {
                        const customer = await db.collection('customers').findOne({ _id: toObjectId(profile.customerId) });
                        if (customer) {
                            employeeName = customer.name || customer.companyName || employeeName;
                        }
                    }
                }
            }

            if (!employeeName) return null;
            return {
                title: 'Nuevo empleado registrado',
                message: position ? `${employeeName} - ${position}` : employeeName,
                navigateTo: id ? `/payroll/employees?id=${id}` : '/payroll/employees',
                metadata: { ...meta, employeeName, position, department },
            };
        }

        case 'campaign.started':
        case 'campaign.response': {
            return {
                navigateTo: id ? `/marketing?tab=campaigns&id=${id}` : '/marketing',
            };
        }

        case 'order.created':
        case 'order.confirmed':
        case 'order.fulfilled':
        case 'order.cancelled':
        case 'order.paid': {
            let orderNumber = meta.orderNumber;
            let customerName = meta.customerName;
            let totalAmount = meta.total ?? meta.totalAmount;
            let paidAmount = meta.paidAmount;

            if (oid) {
                const order = await db.collection('orders').findOne({ _id: oid });
                if (order) {
                    orderNumber = order.orderNumber || orderNumber;
                    customerName = order.customerName || customerName;
                    totalAmount = order.totalAmount ?? totalAmount;
                    paidAmount = order.paidAmount ?? paidAmount;
                }
            }

            const tot = numberOr(totalAmount);
            const paid = numberOr(paidAmount, tot);
            const num = orderNumber || (id ? `${String(id).slice(-6)}` : 's/n');
            const titleByType: Record<string, string> = {
                'order.created': `Nueva orden #${num} - Pago pendiente`,
                'order.confirmed': `Orden #${num} confirmada`,
                'order.fulfilled': `Orden #${num} entregada`,
                'order.cancelled': `Orden #${num} cancelada`,
                'order.paid': `✅ Venta completada #${num}`,
            };
            const amountForMsg = type === 'order.paid' ? paid : tot;
            return {
                title: titleByType[type] || notification.title,
                message: customerName
                    ? `${customerName} - $${amountForMsg.toFixed(2)}`
                    : `Total: $${amountForMsg.toFixed(2)}`,
                navigateTo: id ? `/orders/history?orderId=${id}` : '/orders/history',
                metadata: { ...meta, orderNumber, customerName, totalAmount: tot, paidAmount: paid },
            };
        }

        case 'inventory.low_stock':
        case 'inventory.expiring': {
            let productName = meta.productName;
            let currentStock = meta.currentStock;
            let minimumStock = meta.minimumStock;
            let expirationDate = meta.expirationDate;

            if (oid) {
                const product = await db.collection('products').findOne({ _id: oid });
                if (product) {
                    productName = product.name || productName;
                }
            }

            if (!productName) return null;
            const isExpiring = type === 'inventory.expiring';
            return {
                title: isExpiring ? `Producto por vencer: ${productName}` : `Stock bajo: ${productName}`,
                message: isExpiring
                    ? `Vence el ${formatDate(expirationDate) || 'pronto'}`
                    : `Stock actual: ${numberOr(currentStock)} / Minimo: ${numberOr(minimumStock)}`,
                navigateTo: id ? `/inventory-management?productId=${id}` : '/inventory-management',
                metadata: { ...meta, productName },
            };
        }

        case 'calendar.reminder': {
            let eventTitle = meta.eventTitle;
            let eventStart = meta.eventStart;
            if (oid) {
                const ev = await db.collection('events').findOne({ _id: oid });
                if (ev) {
                    eventTitle = ev.title || eventTitle;
                    eventStart = ev.start || eventStart;
                }
            }
            if (!eventTitle) return null;
            return {
                title: `Recordatorio: ${eventTitle}`,
                message: eventStart
                    ? `Evento programado para ${new Date(eventStart).toLocaleString('es')}`
                    : 'Recordatorio de evento',
                navigateTo: id ? `/calendar?eventId=${id}` : '/calendar',
                metadata: { ...meta, eventTitle, eventStart },
            };
        }

        default:
            return null;
    }
}

const isBroken = (n: any): boolean => {
    if (n.message) {
        if (n.message.includes('undefined')) return true;
        if (n.message.includes('NaN')) return true;
        if (/\$0\.00/.test(n.message)) return true;
        if (/Wed |Mon |Tue |Thu |Fri |Sat |Sun /.test(n.message)) return true; // raw Date.toString()
    }
    return isBrokenNav(n);
};

const isBrokenNav = (n: any): boolean => {
    if (!n.navigateTo) return false;
    if (n.navigateTo.includes('/undefined')) return true;
    return /^\/(accounting\/payables|accounting\/bank-accounts|payroll\/runs\/|marketing\/campaigns)/.test(n.navigateTo)
        || /^\/billing\/[a-f0-9]{24}$/.test(n.navigateTo);
};

async function migrate() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();
        const coll = db.collection('notifications');

        const total = await coll.countDocuments({});
        console.log(`📊 Total notificaciones en colección: ${total}`);

        const candidates = await coll.find({ isDeleted: { $ne: true } }).toArray();
        console.log(`📦 Activas (no soft-deleted): ${candidates.length}`);

        let toRebuild = 0;
        let willPurge = 0;
        let untouched = 0;
        const samples: any[] = [];
        const purgeIds: ObjectId[] = [];

        for (const n of candidates) {
            if (!isBroken(n)) {
                untouched++;
                continue;
            }

            const fix = await rebuild(n, db);
            if (!fix) {
                willPurge++;
                purgeIds.push(n._id);
                if (samples.length < 5) {
                    samples.push({ _id: n._id.toString(), type: n.type, title: n.title, message: n.message, reason: 'no recoverable data' });
                }
                continue;
            }

            toRebuild++;
            if (samples.length < 5) {
                samples.push({
                    _id: n._id.toString(),
                    type: n.type,
                    before: { message: n.message, navigateTo: n.navigateTo },
                    after: { title: fix.title, message: fix.message, navigateTo: fix.navigateTo },
                });
            }

            if (APPLY) {
                const update: Record<string, any> = {};
                if (fix.title && fix.title !== n.title) update.title = fix.title;
                if (fix.message && fix.message !== n.message) update.message = fix.message;
                if (fix.navigateTo && fix.navigateTo !== n.navigateTo) update.navigateTo = fix.navigateTo;
                if (fix.metadata) update.metadata = fix.metadata;
                if (Object.keys(update).length > 0) {
                    await coll.updateOne({ _id: n._id }, { $set: update });
                }
            }
        }

        if (APPLY && PURGE_BROKEN && purgeIds.length > 0) {
            const purgeResult = await coll.updateMany(
                { _id: { $in: purgeIds } },
                { $set: { isDeleted: true, deletedAt: new Date() } }
            );
            console.log(`🗑️  Soft-deleted ${purgeResult.modifiedCount} notificaciones irrecuperables`);
        }

        console.log('\n📊 Resumen:');
        console.log(`   Sin tocar:        ${untouched}`);
        console.log(`   A reescribir:     ${toRebuild}`);
        console.log(`   Irrecuperables:   ${willPurge} ${PURGE_BROKEN ? '(serán soft-deleted)' : '(NO se tocan, set PURGE_BROKEN=true para borrarlas)'}`);
        console.log(`\n   Modo: ${APPLY ? '✍️  APPLY (cambios escritos)' : '🔍 DRY-RUN (no se escribió nada)'}`);

        if (samples.length > 0) {
            console.log('\n🔍 Muestras:');
            console.dir(samples, { depth: 4 });
        }

        if (!APPLY) {
            console.log('\n👉 Para aplicar:           APPLY=true npx ts-node scripts/fix-notification-messages.ts');
            console.log('👉 Para aplicar y purgar:   APPLY=true PURGE_BROKEN=true npx ts-node scripts/fix-notification-messages.ts');
        }
    } finally {
        await client.close();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    });
