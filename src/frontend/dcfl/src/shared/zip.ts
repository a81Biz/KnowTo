// Implementación mínima de ZIP con método STORE (sin compresión).
// No requiere ninguna librería externa — usa solo TypedArrays del navegador.

// Tabla CRC-32 calculada una vez al importar el módulo.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ data[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): [number, number] {
  return [n & 0xff, (n >> 8) & 0xff];
}

function u32(n: number): [number, number, number, number] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

interface ZipEntry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

/**
 * Genera archivos ZIP en memoria usando el método STORE (sin compresión).
 * Válido en todos los navegadores modernos.
 *
 * @example
 * const zip = new ZipWriter();
 * zip.addFile('hola.md', '# Hola mundo');
 * const blob = zip.toBlob();
 * // → disparar descarga con URL.createObjectURL(blob)
 */
export class ZipWriter {
  private entries: ZipEntry[] = [];
  private body: number[] = [];

  /** Añade un archivo de texto al ZIP. */
  addFile(name: string, content: string): void {
    const nameBytes = new TextEncoder().encode(name);
    const data = new TextEncoder().encode(content);
    const crc = crc32(data);
    const offset = this.body.length;

    this.body.push(
      // Local file header
      ...u32(0x04034b50), // signature
      ...u16(20),          // version needed to extract
      ...u16(0),           // general purpose bit flag
      ...u16(0),           // compression method: STORE
      ...u16(0),           // last mod file time
      ...u16(0),           // last mod file date
      ...u32(crc),
      ...u32(data.length), // compressed size = uncompressed for STORE
      ...u32(data.length), // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0),           // extra field length
      ...nameBytes,
      ...data,
    );

    this.entries.push({ nameBytes, data, crc, offset });
  }

  /** Devuelve el ZIP como Blob descargable. */
  toBlob(): Blob {
    const centralDir: number[] = [];

    for (const e of this.entries) {
      centralDir.push(
        ...u32(0x02014b50), // central directory signature
        ...u16(20),          // version made by
        ...u16(20),          // version needed
        ...u16(0),           // flags
        ...u16(0),           // compression
        ...u16(0),           // mod time
        ...u16(0),           // mod date
        ...u32(e.crc),
        ...u32(e.data.length), // compressed size
        ...u32(e.data.length), // uncompressed size
        ...u16(e.nameBytes.length),
        ...u16(0),           // extra field length
        ...u16(0),           // file comment length
        ...u16(0),           // disk number start
        ...u16(0),           // internal file attributes
        ...u32(0),           // external file attributes
        ...u32(e.offset),    // relative offset of local header
        ...e.nameBytes,
      );
    }

    const cdOffset = this.body.length;
    const cdSize = centralDir.length;

    const eocd = [
      ...u32(0x06054b50),          // end of central directory signature
      ...u16(0),                    // number of this disk
      ...u16(0),                    // disk where central directory starts
      ...u16(this.entries.length),  // number of central directory records on this disk
      ...u16(this.entries.length),  // total number of central directory records
      ...u32(cdSize),               // size of central directory (bytes)
      ...u32(cdOffset),             // offset of start of central directory
      ...u16(0),                    // comment length
    ];

    return new Blob(
      [new Uint8Array(this.body), new Uint8Array(centralDir), new Uint8Array(eocd)],
      { type: 'application/zip' },
    );
  }
}

/** Crea un enlace temporal y dispara la descarga del Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revocar después de un tiempo para liberar memoria
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
