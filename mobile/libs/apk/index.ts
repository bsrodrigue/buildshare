import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy';
import JSZip from 'jszip';

import { AXMLParser } from './parser';

// @ts-ignore
global.Buffer = Buffer;

export interface APKAnalysisResult {
  appId: string;
  versionCode: number;
  hash: string;
}

export async function analyzeAPK(uri: string): Promise<APKAnalysisResult> {
  const fileInfo = await getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }

  // 1. Calculate SHA-256 Hash
  // Optimization: read as base64 once for both hashing and ZIP extraction
  const base64Content = await readAsStringAsync(uri, {
    encoding: 'base64',
  });

  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64Content, {
    encoding: Crypto.CryptoEncoding.HEX,
  });

  // 2. Extract and Parse AndroidManifest.xml
  const zip = await JSZip.loadAsync(base64Content, { base64: true });
  const manifestFile = zip.file('AndroidManifest.xml');

  if (!manifestFile) {
    throw new Error('Invalid APK: AndroidManifest.xml not found');
  }

  const manifestBuffer = await manifestFile.async('arraybuffer');
  const parser = new AXMLParser(manifestBuffer);
  const metadata = parser.parse();

  return {
    appId: metadata.packageName,
    versionCode: metadata.versionCode,
    hash: hash,
  };
}
