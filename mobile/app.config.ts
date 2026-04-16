import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Songre',
  slug: 'songre',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'songre',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      LSApplicationQueriesSchemes: ['whatsapp', 'tel', 'mailto'],
      NSPhotoLibraryUsageDescription:
        "L'application a besoin d'accéder à vos photos pour personnaliser votre profil.",
      NSCameraUsageDescription:
        "L'application a besoin d'utiliser l'appareil photo pour capturer votre photo de profil.",
    },
    entitlements: {
      'aps-environment': process.env.APP_VARIANT === 'production' ? 'production' : 'development',
      'com.apple.security.application-groups': ['group.bf.songre.onesignal'],
    },
    bundleIdentifier: 'bf.songre',
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS,
    },
  },
  android: {
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    package: 'bf.songre',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'onesignal-expo-plugin',
      {
        mode: process.env.APP_VARIANT === 'production' ? 'production' : 'development',
      },
    ],
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/icons/icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#1d1c22',
        dark: {
          backgroundColor: '#1d1c22',
        },
      },
    ],
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          "L'application utilise votre localisation pour suivre vos livraisons en temps réel.",
        locationAlwaysPermission:
          "L'application utilise votre localisation en arrière-plan pour suivre vos livraisons.",
        locationWhenInUsePermission:
          "L'application utilise votre localisation pour afficher votre position sur la carte.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          gradleProps: {
            'org.gradle.jvmargs':
              '-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
            'org.gradle.daemon': 'true',
            'org.gradle.parallel': 'true',
            'org.gradle.caching': 'true',
            'org.gradle.configureondemand': 'true',
            'kotlin.incremental': 'true',
            'kapt.incremental.apt': 'true',
            'android.nonTransitiveRClass': 'true',
            reactNativeArchitectures: 'arm64-v8a',
          },
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: '928ab7ec-d53f-4a07-9d8e-889efa8ff84c',
    },
    // Environment variables baked into the app at build time
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_DIRECTIONS_BASE_URL: process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_BASE_URL,
    GOOGLE_MAPS_API_KEY_IOS: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS,
    ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    API_URL: process.env.EXPO_PUBLIC_API_URL,
    PUSHER_KEY: process.env.EXPO_PUBLIC_PUSHER_KEY,
    PUSHER_CLUSTER: process.env.EXPO_PUBLIC_PUSHER_CLUSTER,
    PUSHER_HOST: process.env.EXPO_PUBLIC_PUSHER_HOST,
    PUSHER_AUTH_ENDPOINT: process.env.EXPO_PUBLIC_PUSHER_AUTH_ENDPOINT,
  },
  owner: 'songre',
});
