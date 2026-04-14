// src/core/services/upload.service.ts
// Gestión de archivos adjuntos (instrumentos completados en papel).
// (Movido desde cce/services/upload.service.ts — sin cambios de comportamiento)
//
// Dev:  almacenamiento en memoria (mock). No persiste entre reinicios.
// Prod: Supabase Storage (bucket configurable, por defecto 'site-instruments').

import type { Env } from '../types/env';

interface StoredFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  base64Content: string;
  instrumentId: string;
  projectId: string;
  uploadedAt: string;
}

// Mock store para desarrollo (módulo-level, persiste dentro de una sesión)
const _devStore = new Map<string, StoredFile>();

export class UploadService {
  private isDev: boolean;

  /**
   * @param env        Workers bindings
   * @param bucketName Nombre del bucket de Supabase Storage (por defecto 'cce-instruments')
   */
  constructor(
    private readonly env: Env,
    private readonly bucketName: string = 'cce-instruments'
  ) {
    this.isDev = env.ENVIRONMENT !== 'production';
  }

  async storeFile(params: {
    projectId: string;
    instrumentId: string;
    fileName: string;
    mimeType: string;
    base64Content: string;
  }): Promise<{ fileId: string; fileName: string; instrumentId: string }> {
    const fileId = crypto.randomUUID();

    if (this.isDev) {
      _devStore.set(fileId, {
        fileId,
        fileName:      params.fileName,
        mimeType:      params.mimeType,
        base64Content: params.base64Content,
        instrumentId:  params.instrumentId,
        projectId:     params.projectId,
        uploadedAt:    new Date().toISOString(),
      });
      return { fileId, fileName: params.fileName, instrumentId: params.instrumentId };
    }

    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const buffer = Buffer.from(params.base64Content, 'base64');
    const storagePath = `${params.projectId}/${params.instrumentId}/${fileId}_${params.fileName}`;

    const { error } = await client.storage
      .from(this.bucketName)
      .upload(storagePath, buffer, { contentType: params.mimeType, upsert: false });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    return { fileId, fileName: params.fileName, instrumentId: params.instrumentId };
  }

  async getFile(fileId: string): Promise<StoredFile | null> {
    if (this.isDev) return _devStore.get(fileId) ?? null;
    return null; // Prod: query storage metadata — out of scope
  }

  async deleteFile(fileId: string): Promise<void> {
    if (this.isDev) { _devStore.delete(fileId); return; }
    // Prod: remove from storage — out of scope
  }
}
