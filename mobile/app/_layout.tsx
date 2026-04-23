import '@/libs/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import useInitApp from '@/hooks/init';
import { useAppFonts } from '@/hooks/useAppFonts';
import { createLogger } from '@/libs/log';
import { toastConfig } from '@/libs/notification/toast/ToastConfig';
import { GlobalErrorBoundary } from '@/modules/shared/components/GlobalErrorBoundary';
import { ThemeProvider, useTheme } from '@/modules/shared/theme/ThemeProvider';

const logger = createLogger('RootLayout');
const queryClient = new QueryClient();

function RootLayoutContent() {
  const { appIsReady, onLayoutRootView } = useAppFonts();
  const { isLoading: isInitLoading, isAuthenticated } = useInitApp();
  const { paperTheme } = useTheme();

  const isLoading = !appIsReady || isInitLoading;

  if (isLoading) {
    logger.debug('Loading application...');
    return null;
  }

  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider
        onLayout={() => {
          void onLayoutRootView();
        }}
      >
        <PaperProvider theme={paperTheme}>
          <StatusBar style="auto" />
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

          <Toast config={toastConfig} />
        </PaperProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
