import { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import Purchases, { CustomerInfo, PurchasesError, PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { SubscriptionTier } from "@/types/subscription";

const PRO_ENTITLEMENT_ID = "pro";
const SUBSCRIPTION_QUERY_KEY = ["subscription"] as const;
const OFFERINGS_QUERY_KEY = ["revenuecat-offerings"] as const;

function getRevenueCatApiKey(): string | undefined {
  if (__DEV__ || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

const revenueCatApiKey = getRevenueCatApiKey();
let isRevenueCatConfigured = false;

if (revenueCatApiKey) {
  Purchases.configure({ apiKey: revenueCatApiKey });
  isRevenueCatConfigured = true;
}

function mapCustomerInfoToState(customerInfo: CustomerInfo): SubscriptionState {
  const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  return {
    tier: entitlement ? "pro" : "free",
    subscribedAt: entitlement?.latestPurchaseDate ?? null,
    expiresAt: entitlement?.expirationDate ?? null,
  };
}

async function requireRevenueCat(): Promise<void> {
  if (!isRevenueCatConfigured) {
    throw new Error("RevenueCat is not configured yet. Add the public API keys before testing billing.");
  }
}

interface SubscriptionState {
  tier: SubscriptionTier;
  subscribedAt: string | null;
  expiresAt: string | null;
}

const DEFAULT_STATE: SubscriptionState = {
  tier: "free",
  subscribedAt: null,
  expiresAt: null,
};

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [state, setState] = useState<SubscriptionState>(DEFAULT_STATE);
  const queryClient = useQueryClient();

  const subQuery = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: async (): Promise<SubscriptionState> => {
      await requireRevenueCat();
      const customerInfo = await Purchases.getCustomerInfo();
      return mapCustomerInfoToState(customerInfo);
    },
    retry: false,
  });

  const offeringsQuery = useQuery({
    queryKey: OFFERINGS_QUERY_KEY,
    queryFn: async (): Promise<PurchasesOffering | null> => {
      await requireRevenueCat();
      const offerings = await Purchases.getOfferings();
      return offerings.current ?? null;
    },
    retry: false,
  });

  useEffect(() => {
    if (subQuery.data) {
      setState(subQuery.data);
    }
  }, [subQuery.data]);

  const subscribeMutation = useMutation({
    mutationFn: async (pkg?: PurchasesPackage): Promise<SubscriptionState> => {
      await requireRevenueCat();
      const packageToBuy = pkg ?? offeringsQuery.data?.availablePackages[0];
      if (!packageToBuy) {
        throw new Error("No subscription packages are available yet.");
      }
      try {
        const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
        return mapCustomerInfoToState(customerInfo);
      } catch (error) {
        const purchasesError = error as PurchasesError;
        if (purchasesError.userCancelled) {
          return state;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      setState(data);
      queryClient.setQueryData(SUBSCRIPTION_QUERY_KEY, data);
      console.log("[Subscription] Purchase completed:", data.tier);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (): Promise<SubscriptionState> => {
      await requireRevenueCat();
      const customerInfo = await Purchases.restorePurchases();
      return mapCustomerInfoToState(customerInfo);
    },
    onSuccess: (data) => {
      setState(data);
      queryClient.setQueryData(SUBSCRIPTION_QUERY_KEY, data);
      console.log("[Subscription] Restore result:", data.tier);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (): Promise<SubscriptionState> => DEFAULT_STATE,
    onSuccess: () => {
      setState(DEFAULT_STATE);
      queryClient.setQueryData(SUBSCRIPTION_QUERY_KEY, DEFAULT_STATE);
      console.log("[Subscription] Local subscription state refreshed");
    },
  });

  const isPro = state.tier === "pro";

  const { mutate: subscribeMutate } = subscribeMutation;
  const { mutate: restoreMutate } = restoreMutation;
  const { mutate: cancelMutate } = cancelMutation;

  const subscribe = useCallback((pkg?: PurchasesPackage) => {
    subscribeMutate(pkg);
  }, [subscribeMutate]);

  const restore = useCallback(() => {
    restoreMutate();
  }, [restoreMutate]);

  const cancel = useCallback(() => {
    cancelMutate();
  }, [cancelMutate]);

  return {
    tier: state.tier,
    isPro,
    subscribedAt: state.subscribedAt,
    expiresAt: state.expiresAt,
    subscribe,
    restore,
    cancel,
    subscribeError: subscribeMutation.error,
    restoreError: restoreMutation.error,
    offering: offeringsQuery.data ?? null,
    packages: offeringsQuery.data?.availablePackages ?? [],
    isRevenueCatConfigured,
    isSubscribing: subscribeMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isLoading: subQuery.isLoading || offeringsQuery.isLoading,
  };
});
