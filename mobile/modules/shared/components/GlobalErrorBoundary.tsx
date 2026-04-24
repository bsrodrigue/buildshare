import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';

import { createLogger } from '@/libs/log';
import { useAuthStore } from '@/modules/auth/store';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Unhandled UI Error', error);
    logger.debug('Error Info', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Surface style={styles.card} elevation={2}>
            <Text variant="headlineMedium" style={styles.title}>
              Oups !
            </Text>
            <Text variant="bodyMedium" style={styles.message}>
              Une erreur inattendue est survenue dans l&apos;application. Nos ingénieurs ont été
              notifiés.
            </Text>
            {__DEV__ && (
              <Text variant="bodySmall" style={styles.stack}>
                {this.state.error?.message}
              </Text>
            )}
            <Button mode="contained" onPress={this.handleReset} style={styles.button}>
              Réessayer
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                void useAuthStore.getState().logout();
                this.handleReset();
              }}
              style={styles.logoutButton}
              textColor="#D32F2F"
            >
              Déconnexion
            </Button>
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  stack: {
    color: '#D32F2F',
    marginBottom: 20,
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  button: {
    marginTop: 8,
    width: '100%',
  },
  logoutButton: {
    marginTop: 12,
    width: '100%',
    borderColor: '#D32F2F',
  },
});
