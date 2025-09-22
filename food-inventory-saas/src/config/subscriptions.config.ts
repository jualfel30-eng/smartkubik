export interface SubscriptionPlan {
  name: string;
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxOrders: number; // per month
    maxStorage: number; // in MB
  };
}

export const subscriptionPlans: Record<string, SubscriptionPlan> = {
  trial: {
    name: 'Trial',
    limits: {
      maxUsers: 5,
      maxProducts: 50,
      maxOrders: 100,
      maxStorage: 500,
    },
  },
  basic: {
    name: 'Basic',
    limits: {
      maxUsers: 10,
      maxProducts: 500,
      maxOrders: 1000,
      maxStorage: 2000, // 2GB
    },
  },
  premium: {
    name: 'Premium',
    limits: {
      maxUsers: 50,
      maxProducts: 5000,
      maxOrders: 10000,
      maxStorage: 10000, // 10GB
    },
  },
  enterprise: {
    name: 'Enterprise',
    limits: {
      maxUsers: Infinity,
      maxProducts: Infinity,
      maxOrders: Infinity,
      maxStorage: Infinity,
    },
  },
};

export const getPlanLimits = (plan: string): SubscriptionPlan['limits'] => {
  return subscriptionPlans[plan]?.limits || subscriptionPlans.trial.limits;
};
