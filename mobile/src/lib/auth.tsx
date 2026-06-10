import { ClerkProvider, useAuth as useClerkAuth, useClerk as useClerkInstance } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

import { mobileConfig } from '@/lib/config';

type AppAuthContextValue = {
  getToken: () => Promise<string | null>;
  isDevBypass: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
};

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

function ClerkBridge({ children }: PropsWithChildren) {
  const auth = useClerkAuth();
  const clerk = useClerkInstance();
  const value = useMemo<AppAuthContextValue>(
    () => ({
      getToken: auth.getToken,
      isDevBypass: false,
      isLoaded: auth.isLoaded,
      isSignedIn: Boolean(auth.isSignedIn),
      signOut: clerk.signOut,
    }),
    [auth.getToken, auth.isLoaded, auth.isSignedIn, clerk.signOut],
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function AppAuthProvider({ children }: PropsWithChildren) {
  if (mobileConfig.devAuthBypass) {
    return (
      <AppAuthContext.Provider
        value={{
          getToken: async () => null,
          isDevBypass: true,
          isLoaded: true,
          isSignedIn: true,
          signOut: async () => undefined,
        }}>
        {children}
      </AppAuthContext.Provider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={mobileConfig.clerkPublishableKey}
      tokenCache={tokenCache}>
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}

export function useAppAuth() {
  const context = useContext(AppAuthContext);

  if (!context) {
    throw new Error('useAppAuth must be used inside AppAuthProvider');
  }

  return {
    getToken: context.getToken,
    isDevBypass: context.isDevBypass,
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
  };
}

export function useAppClerk() {
  const context = useContext(AppAuthContext);

  if (!context) {
    throw new Error('useAppClerk must be used inside AppAuthProvider');
  }

  return {
    isDevBypass: context.isDevBypass,
    signOut: context.signOut,
  };
}
