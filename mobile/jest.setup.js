/* global jest */

import 'react-native-gesture-handler/jestSetup';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useSegments: jest.fn(() => []),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Error: 'error',
    Success: 'success',
    Warning: 'warning',
  },
}));

// Mock Logger to prevent noisy console output during tests
jest.mock('@/libs/log', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      exception: jest.fn(),
    })),
  };
});
