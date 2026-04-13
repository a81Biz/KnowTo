// src/__tests__/cce/services/upload.cce.test.ts
import { describe, it, expect } from 'vitest';
import { UploadService } from '../../../cce/services/upload.service';
import type { Env } from '../../../core/types/env';

const DEV_ENV: Env = { ENVIRONMENT: 'development' } as Env;

const SAMPLE_FILE = {
  projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
  instrumentId: 'entrevista-director',
  fileName: 'instrumento-completado.pdf',
  mimeType: 'application/pdf',
  base64Content: 'JVBERi0xLjQK', // minimal base64 stub
};

describe('CCE UploadService — modo desarrollo (mock store)', () => {
  it('storeFile devuelve un fileId UUID válido', async () => {
    const svc = new UploadService(DEV_ENV);
    const result = await svc.storeFile(SAMPLE_FILE);
    expect(result.fileId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('storeFile preserva fileName e instrumentId en la respuesta', async () => {
    const svc = new UploadService(DEV_ENV);
    const result = await svc.storeFile(SAMPLE_FILE);
    expect(result.fileName).toBe(SAMPLE_FILE.fileName);
    expect(result.instrumentId).toBe(SAMPLE_FILE.instrumentId);
  });

  it('getFile devuelve el archivo almacenado por su fileId', async () => {
    const svc = new UploadService(DEV_ENV);
    const { fileId } = await svc.storeFile(SAMPLE_FILE);
    const stored = await svc.getFile(fileId);
    expect(stored).not.toBeNull();
    expect(stored!.fileName).toBe(SAMPLE_FILE.fileName);
    expect(stored!.instrumentId).toBe(SAMPLE_FILE.instrumentId);
    expect(stored!.projectId).toBe(SAMPLE_FILE.projectId);
  });

  it('getFile devuelve null para un fileId desconocido', async () => {
    const svc = new UploadService(DEV_ENV);
    const result = await svc.getFile('non-existent-id');
    expect(result).toBeNull();
  });

  it('deleteFile elimina el archivo del store', async () => {
    const svc = new UploadService(DEV_ENV);
    const { fileId } = await svc.storeFile(SAMPLE_FILE);
    await svc.deleteFile(fileId);
    const after = await svc.getFile(fileId);
    expect(after).toBeNull();
  });

  it('cada storeFile genera un fileId diferente', async () => {
    const svc = new UploadService(DEV_ENV);
    const r1 = await svc.storeFile(SAMPLE_FILE);
    const r2 = await svc.storeFile({ ...SAMPLE_FILE, instrumentId: 'cuestionario' });
    expect(r1.fileId).not.toBe(r2.fileId);
  });

  it('storeFile acepta diferentes tipos MIME', async () => {
    const svc = new UploadService(DEV_ENV);
    const jpg = await svc.storeFile({ ...SAMPLE_FILE, mimeType: 'image/jpeg', fileName: 'scan.jpg' });
    const png = await svc.storeFile({ ...SAMPLE_FILE, mimeType: 'image/png', fileName: 'scan.png' });
    expect(jpg.fileId).toBeTruthy();
    expect(png.fileId).toBeTruthy();
  });
});
