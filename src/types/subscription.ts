// src/types/subscription.ts

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface SubscriptionState {
  tier: SubscriptionTier;
  count: number;     // Usos actuales
  limit: number;     // Límite del plan
  loading: boolean;
}

// Estos son los límites "Hardcoded" para referencia global
export const PLAN_LIMITS = {
  free: 20,
  basic: 300,
  pro: 999999
};

// Agrega esto al final:
export interface DashboardProfileProps {
  subscription_tier?: string | SubscriptionTier; 
  notes_usage_count?: number;
  current_period_end?: string;
  // Permite que pasen otras propiedades extra sin que TypeScript se queje
  [key: string]: any; 
}