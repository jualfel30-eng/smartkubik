// /scripts/reset-password.ts
import { connect, disconnect, model } from 'mongoose';
import { User, UserSchema } from '../src/schemas/user.schema';
import * as bcrypt from 'bcrypt';

async function resetPassword() {
  // 1. Get Atlas URI from environment variable
  const MONGODB_URI = process.env.MONGODB_URI;
  // 2. Get email and new password from command-line arguments
  const userEmail = process.argv[2];
  const newPassword = process.argv[3];

  // 3. Validate inputs
  if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI environment variable is not set.');
    console.error('Usage: MONGODB_URI=<your_atlas_uri> npx tsx scripts/reset-password.ts <email> <new_password>');
    process.exit(1);
  }

  if (!userEmail || !newPassword) {
    console.error('❌ ERROR: Missing arguments.');
    console.error('Usage: MONGODB_URI=<your_atlas_uri> npx tsx scripts/reset-password.ts <email> <new_password>');
    process.exit(1);
  }

  try {
    // 4. Connect to DB
    await connect(MONGODB_URI);
    console.log(`✅ Connected to database.`);

    const UserModel = model(User.name, UserSchema);

    // 5. Find the user
    console.log(`🔍 Searching for user: ${userEmail}`);
    const user = await UserModel.findOne({ email: userEmail });

    if (!user) {
      console.error(`❌ ERROR: User with email "${userEmail}" not found.`);
      return;
    }

    console.log(`✅ User found: ${user.email} (ID: ${user._id})`);

    // 6. Hash the new password
    console.log('🔒 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 7. Update the user document
    console.log('🔄 Updating user password in the database...');
    await UserModel.updateOne({ _id: user._id }, { $set: { password: hashedPassword, passwordResetToken: undefined, passwordResetExpires: undefined } }); // Also clear reset tokens

    console.log('🎉 Success! Password has been reset.');
    console.log(`User ${userEmail} can now log in with the new password.`);

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
  } finally {
    // 8. Disconnect
    await disconnect();
    console.log('🔌 Disconnected from database.');
  }
}

resetPassword();
