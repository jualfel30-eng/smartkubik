import { connect, disconnect, model } from 'mongoose';
import { User, UserSchema } from '../src/schemas/user.schema';

async function debugUser() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  const UserModel = model(User.name, UserSchema);

  console.log('--- Searching for user: admin@earlyadopter.com ---');
  const adminUser = await UserModel.findOne({ email: 'admin@earlyadopter.com' }).exec();

  if (adminUser) {
    console.log('--- USER FOUND ---');
    console.log(JSON.stringify(adminUser.toObject(), null, 2));
  } else {
    console.log('--- USER NOT FOUND ---');
  }

  await disconnect();
  console.log('--- Debug script finished ---');
}

debugUser().catch(err => {
  console.error('Error running debug script:', err);
  process.exit(1);
});
