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
    name: "Trial",
    limits: {
      maxUsers: 5,
      maxProducts: 50,
      maxOrders: 100,
      maxStorage: 500,
    },
  },
  fundamental: {
    name: "Fundamental",
    limits: {
      maxUsers: 1,
      maxProducts: 500,
      maxOrders: 1000,
      maxStorage: 2000,
    },
  },
  crecimiento: {
    name: "Crecimiento",
    limits: {
      maxUsers: 5,
      maxProducts: 5000,
      maxOrders: 10000,
      maxStorage: 10000,
    },
  },
  expansion: {
    name: "Expansión",
    limits: {
      maxUsers: Infinity,
      maxProducts: Infinity,
      maxOrders: Infinity,
      maxStorage: Infinity,
    },
  },
};

export const getPlanLimits = (plan: string): SubscriptionPlan["limits"] => {
  const key = plan.toLowerCase();
  return subscriptionPlans[key]?.limits || subscriptionPlans.trial.limits;
};
