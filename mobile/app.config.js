const appJson = require('./app.json');

const expoConfig = appJson.expo;

module.exports = () => ({
  ...expoConfig,
  extra: {
    ...(expoConfig.extra ?? {}),
    clerkPublishableKey:
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      process.env.CLERK_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_AUTH_CLERK_PUBLISHABLE_KEY ??
      '',
  },
});
