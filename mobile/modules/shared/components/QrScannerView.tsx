import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { createLogger } from '@/libs/log';

const logger = createLogger('QrScannerView');

interface QrScannerViewProps {
  onScan: (url: string) => void;
  onCancel: () => void;
}

export function QrScannerView({ onScan, onCancel }: QrScannerViewProps) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const processedRef = useRef(false);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text variant="bodyLarge" style={styles.permissionText}>
          Camera permission is required to scan QR codes.
        </Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant Permission
        </Button>
        <Button onPress={onCancel}>Cancel</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={(result) => {
          if (scanned || processedRef.current) return;
          processedRef.current = true;
          setScanned(true);

          const data = result.data;
          logger.info(`QR scanned: ${data}`);

          try {
            new URL(data);
            onScan(data);
          } catch {
            logger.warn(`Scanned value is not a valid URL: ${data}`);
            setScanned(false);
            processedRef.current = false;
          }
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.viewport} />
        </View>
      </CameraView>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={{ color: '#fff', marginBottom: 12 }}>
          Point the camera at the QR code on the server setup page
        </Text>
        <Button mode="contained" onPress={onCancel} textColor="#fff">
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewport: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
