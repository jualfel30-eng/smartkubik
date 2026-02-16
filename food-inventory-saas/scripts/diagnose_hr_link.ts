
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TipsService } from '../src/modules/tips/tips.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../src/schemas/order.schema';
import { User } from '../src/schemas/user.schema';
import { EmployeeProfile } from '../src/schemas/employee-profile.schema';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const orderModel = app.get<Model<Order>>(getModelToken(Order.name));
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const employeeProfileModel = app.get<Model<EmployeeProfile>>(getModelToken(EmployeeProfile.name));

    console.log('--- DIAGNOSTIC START ---');

    // 1. Fetch Orders with tips from last 30 days
    const tipsOrders = await orderModel.find({
        totalTipsAmount: { $gt: 0 },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10).lean();

    console.log(`Found ${tipsOrders.length} orders with tips.`);

    const relevantUserIds = new Set<string>();

    for (const order of tipsOrders) {
        console.log(`\nOrder: ${order.orderNumber} | Tips: ${order.totalTipsAmount}`);

        // Check assigned waiter
        if (order.assignedWaiterId) {
            const wId = order.assignedWaiterId.toString();
            relevantUserIds.add(wId);
            console.log(`  Header Waiter ID: ${wId}`);
        } else {
            console.log(`  Header Waiter ID: NULL`);
        }

        // Check tipsRecords
        if (order.tipsRecords && order.tipsRecords.length > 0) {
            order.tipsRecords.forEach((tr, idx) => {
                const empId = tr.employeeId ? tr.employeeId.toString() : 'NULL';
                if (empId !== 'NULL') relevantUserIds.add(empId);
                console.log(`  Record #${idx}: EmployeeId=${empId}, Name=${tr.employeeName || 'Empty'}`);
            });
        } else {
            console.log(`  No tipsRecords array.`);
        }
    }

    // 2. Check these IDs in User collection
    const ids = Array.from(relevantUserIds);
    const users = await userModel.find({ _id: { $in: ids } }).lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    console.log('\n--- USER CHECK ---');
    for (const id of ids) {
        const user = userMap.get(id);
        if (user) {
            const u = user as any;
            console.log(`ID ${id} -> FOUND User: ${u.firstName} ${u.lastName} (Email: ${u.email})`);
        } else {
            console.log(`ID ${id} -> NOT FOUND in User collection (This causes 'Desconocido/Inactivo')`);
        }
    }

    // 3. Check Employee Profiles linked to these User IDs
    const profiles = await employeeProfileModel.find({ userId: { $in: ids } }).lean();
    const profileMap = new Map(profiles.map(p => [(p.userId as any).toString(), p]));

    console.log('\n--- EMPLOYEE PROFILE LINK CHECK ---');
    for (const id of ids) {
        const profile = profileMap.get(id);
        if (profile) {
            const prof = profile as any;
            console.log(`ID ${id} -> FOUND Profile. CustomerId: ${prof.customerId}`);
        } else {
            console.log(`ID ${id} -> NO EmployeeProfile linked. (Cannot fetch HR name)`);
        }
    }

    // 4. List ALL Employee Profiles to see what IS there
    const allProfiles = await employeeProfileModel.find({}).limit(10).lean();
    console.log('\n--- ALL AVAILABLE HR PROFILES ---');
    allProfiles.forEach(p => {
        const prof = p as any;
        console.log(`Profile: UserID=${prof.userId || 'NULL'} | Status=${prof.status} | Contract=${prof.currentContractId}`);
    });

    await app.close();
    console.log('--- DIAGNOSTIC END ---');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
