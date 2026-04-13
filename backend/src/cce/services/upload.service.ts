// src/cce/services/upload.service.ts
// Gestión de archivos adjuntos (instrumentos de diagnóstico completados en papel).
//
// Dev: almacenamiento en memoria (mock). No persiste entre reinicios.
// Prod: Supabase Storage (bucket cce-instruments).

import type { Env } from '../../core/types/env';

interface StoredFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  base64Content: string;
  instrumentId: string;
  projectId: string;
  uploadedAt: string;
}

// Mock store para desarrollo
const _devStore = new Map<string, StoredFile>();

export class UploadService {
  private isDev: boolean;

  constructor(private readonly env: Env) {
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
        fileName: params.fileName,
        mimeType: params.mimeType,
        base64Content: params.base64Content,
        instrumentId: params.instrumentId,
        projectId: params.projectId,
        uploadedAt: new Date().toISOString(),
      });
      return { fileId, fileName: params.fileName, instrumentId: params.instrumentId };
    }

    // Prod: upload to Supabase Storage
    // The Supabase client must be initialised with service role for storage access
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const buffer = Buffer.from(params.base64Content, 'base64');
    const path = `${params.projectId}/${params.instrumentId}/${fileId}_${params.fileName}`;

    const { error } = await client.storage
      .from('cce-instruments')
      .upload(path, buffer, { contentType: params.mimeType, upsert: false });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    return { fileId, fileName: params.fileName, instrumentId: params.instrumentId };
  }

  async getFile(fileId: string): Promise<StoredFile | null> {
    if (this.isDev) {
      return _devStore.get(fileId) ?? null;
    }
    // Prod: would query storage metadata — omitted for scope
    return null;
  }

  async deleteFile(fileId: string): Promise<void> {
    if (this.isDev) {
      _devStore.delete(fileId);
      return;
    }
    // Prod: would remove from storage — omitted for scope
  }
}
