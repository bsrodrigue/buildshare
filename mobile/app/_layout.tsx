import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import useInitApp from '@/hooks/init';
import { useAppFonts } from '@/hooks/useAppFonts';
import { createLogger } from '@/libs/log';
import { ThemeProvider } from '@/modules/shared/theme/ThemeProvider';

const logger = createLogger('RootLayout');
const queryClient = new QueryClient();

function RootLayoutContent() {
  const { appIsReady, onLayoutRootView } = useAppFonts();
  const { isLoading: isInitLoading, isAuthenticated } = useInitApp();

  const isLoading = !appIsReady || isInitLoading;

  if (isLoading) {
    logger.debug('Loading application...');
    return null;
  }

  logger.info(
    `Application loaded - IS_AUTHENTICATED: ${isAuthenticated} - APP_IS_READY: ${appIsReady}`,
  );

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <ThemeProvider>
        <KeyboardProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            {/* Private Screens */}
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(protected)" />
            </Stack.Protected>

            {/* Public Screens */}
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </KeyboardProvider>

        <Toast />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutContent />
    </QueryClientProvider>
  );
}
