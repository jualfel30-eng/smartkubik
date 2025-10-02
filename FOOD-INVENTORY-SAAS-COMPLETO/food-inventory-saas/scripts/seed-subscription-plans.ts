import { connect, disconnect, model } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../src/schemas/subscription-plan.schema';
import { subscriptionPlans as hardcodedPlans } from '../src/config/subscriptions.config';

async function seedSubscriptionPlans() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  console.log('Seeding subscription plans...');

  const PlanModel = model(SubscriptionPlan.name, SubscriptionPlanSchema);

  const planPromises = Object.values(hardcodedPlans).map(planData => {
    console.log(`Processing plan: ${planData.name}`);
    return PlanModel.findOneAndUpdate(
      { name: planData.name }, // Find by name to prevent duplicates
      {
        $set: {
          name: planData.name,
          description: `${planData.name} subscription plan.`, // Add a default description
          price: 0, // Default price to 0, can be updated later
          limits: planData.limits,
          features: [], // Default features
          isPublic: true,
          isArchived: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });

  const results = await Promise.all(planPromises);
  console.log(`${results.length} subscription plans have been seeded successfully.`);

  await disconnect();
  console.log('Disconnected from database.');
}

seedSubscriptionPlans().catch(err => {
  console.error('Error seeding subscription plans:', err);
  process.exit(1);
});
