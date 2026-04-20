import Toast from 'react-native-toast-message';

export const toast = {
  success: (title: string, message?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
    });
  },
  error: (title: string, message?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
    });
  },
  info: (title: string, message?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
    });
  },
  /**
   * Generic show method if advanced configuration is needed.
   * This is the only place where we touch the library directly.
   */
  show: (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
    });
  },
};
