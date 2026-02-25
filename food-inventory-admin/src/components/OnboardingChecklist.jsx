import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Check,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Package,
  ShoppingCart,
  Users,
  Globe,
} from 'lucide-react';

function ChecklistItem({ done, label, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
        done
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'hover:bg-muted/50 text-foreground'
      }`}
    >
      {done ? (
        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className={`text-sm ${done ? 'line-through opacity-60' : 'font-medium'}`}>
        {label}
      </span>
    </button>
  );
}

export default function OnboardingChecklist({ summaryData }) {
  const { tenant, updateTenantContext } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const items = [
    {
      key: 'logo',
      label: 'Subir logo de tu negocio',
      icon: Upload,
      done: !!tenant?.logo,
      path: '/settings',
    },
    {
      key: 'product',
      label: 'Agregar tu primer producto',
      icon: Package,
      done: (summaryData?.totalProducts ?? 0) > 0,
      path: '/inventory-management',
    },
    {
      key: 'sale',
      label: 'Realizar tu primera venta',
      icon: ShoppingCart,
      done: (summaryData?.ordersToday ?? 0) > 0 || (summaryData?.totalOrders ?? 0) > 0,
      path: '/orders',
    },
    {
      key: 'team',
      label: 'Invitar a tu equipo',
      icon: Users,
      done: (summaryData?.totalUsers ?? 0) > 1,
      path: '/settings',
    },
    {
      key: 'storefront',
      label: 'Configurar tu web de ventas',
      icon: Globe,
      done: !!tenant?.enabledModules?.ecommerce,
      path: '/storefront',
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progress = Math.round((completedCount / items.length) * 100);

  // All done — auto-dismiss after showing briefly
  if (completedCount === items.length) return null;

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await fetchApi('/tenant/onboarding-progress', {
        method: 'PATCH',
        body: JSON.stringify({ completed: true }),
      });
      updateTenantContext({ onboardingCompleted: true });
    } catch {
      // Non-blocking
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-semibold">
              Configura tu negocio
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{items.length} completados
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={handleDismiss}
              title="No mostrar más"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0 px-4 pb-3">
          <div className="space-y-0.5">
            {items.map((item) => (
              <ChecklistItem
                key={item.key}
                done={item.done}
                label={item.label}
                icon={item.icon}
                onClick={() => navigate(item.path)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
