import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Define your custom fonts here
// You can download fonts (e.g. from Google Fonts) and place them in assets/fonts/
// Then map them here:
const customFonts = {
  // 'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
  // 'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  // 'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
};

export const useAppFonts = () => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync(customFonts);

        // Artificial delay for demonstration or to ensure smooth transition
        // await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  return { appIsReady, onLayoutRootView };
};
