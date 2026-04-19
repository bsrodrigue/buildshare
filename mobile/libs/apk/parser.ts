/**
 * Minimal Android Binary XML (AXML) Parser
 * Extracts package name and version code from AndroidManifest.xml
 *
 * Based on the Android Binary XML format.
 */

export interface APKMetadata {
  packageName: string;
  versionCode: number;
}

const CHUNK_TYPE_STRING_POOL = 0x0001;
const CHUNK_TYPE_START_ELEMENT = 0x0102;

export class AXMLParser {
  private view: DataView;
  private offset: number = 0;
  private strings: string[] = [];

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  public parse(): APKMetadata {
    // APK Binary XML Header (8 bytes)
    // 0x00080003 (Magic) + FileSize
    const magic = this.readU32();
    if (magic !== 0x00080003) {
      throw new Error('Invalid AXML magic number');
    }
    this.readU32(); // fileSize

    let packageName = '';
    let versionCode = 0;

    while (this.offset < this.view.byteLength) {
      const chunkOffset = this.offset;
      const type = this.readU16();
      const _headerSize = this.readU16();
      const chunkSize = this.readU32();

      if (type === CHUNK_TYPE_STRING_POOL) {
        this.parseStringPool(chunkOffset, _headerSize, chunkSize);
      } else if (type === CHUNK_TYPE_START_ELEMENT) {
        // We only care about the <manifest> tag which is usually the first StartElement
        const result = this.parseStartElement();
        if (result.name === 'manifest') {
          packageName = result.attributes['package'] || '';
          versionCode = parseInt(result.attributes['versionCode'] || '0', 10);
          // Optimization: we have what we need
          break;
        }
      }

      this.offset = chunkOffset + chunkSize;
    }

    return { packageName, versionCode };
  }

  private parseStringPool(offset: number, _headerSize: number, _chunkSize: number) {
    const stringCount = this.readU32();
    const _styleCount = this.readU32();
    const flags = this.readU32();
    const stringsStart = this.readU32();
    const _stylesStart = this.readU32();

    const isUtf8 = (flags & (1 << 8)) !== 0;

    const offsets: number[] = [];
    for (let i = 0; i < stringCount; i++) {
      offsets.push(this.readU32());
    }

    for (let i = 0; i < stringCount; i++) {
      const start = offset + stringsStart + offsets[i];
      this.strings.push(this.readString(start, isUtf8));
    }
  }

  private readString(offset: number, isUtf8: boolean): string {
    let cur = offset;
    if (isUtf8) {
      // UTF-8
      // Length check (2 bytes)
      cur += 2;
      let len = 0;
      while (this.view.getUint8(cur + len) !== 0) {
        len++;
      }
      const bytes = new Uint8Array(this.view.buffer, cur, len);
      return new TextDecoder('utf-8').decode(bytes);
    } else {
      // UTF-16
      // Length check (2 bytes)
      const len = this.view.getUint16(cur, true);
      cur += 2;
      const bytes = new Uint16Array(this.view.buffer, cur, len);
      let str = '';
      for (let j = 0; j < len; j++) {
        str += String.fromCharCode(bytes[j]);
      }
      return str;
    }
  }

  private parseStartElement() {
    this.readU32(); // line
    this.readU32(); // commentIdx
    this.readU32(); // nsIdx
    const nameIdx = this.readU32();
    const name = this.strings[nameIdx];

    const _attributeStart = this.readU16();
    const _attributeSize = this.readU16();
    const attributeCount = this.readU16();

    // Skip to attributes
    this.offset += 6; // idIndex, classIndex, styleIndex

    const attributes: Record<string, string> = {};
    for (let i = 0; i < attributeCount; i++) {
      this.readU32(); // nsIdx
      const attrNameIdx = this.readU32();
      const _rawValueIdx = this.readU32();
      const _typedValueSize = this.readU16();
      const _typedValueRes = this.readU16();
      const typedValueData = this.readU32();

      const attrName = this.strings[attrNameIdx];
      // simplified: if rawValueIdx exists use it, else use data for simple types
      // For packageName and versionCode, they are mostly strings or integers
      attributes[attrName] = typedValueData.toString();

      // If we find the package attribute, it's usually a string reference or direct string
      if (attrName === 'package' || attrName === 'versionCode') {
        // In some cases versionCode is in data
        if (attrName === 'package' && this.strings[typedValueData]) {
          attributes[attrName] = this.strings[typedValueData];
        }
      }
    }

    return { name, attributes };
  }

  private readU32(): number {
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  private readU16(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }
}
