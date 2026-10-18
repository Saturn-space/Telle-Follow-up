import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

function storageKey(): Buffer {
  const encoded = process.env.DOCUMENT_STORAGE_KEY?.trim();
  const key = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
  if (key.length !== 32) throw new Error('DOCUMENT_STORAGE_KEY must be a base64 encoded 32-byte key.');
  return key;
}

function documentDirectory(): string {
  return path.resolve(process.env.DOCUMENT_STORAGE_PATH || path.join(process.cwd(), '.private-data', 'documents'));
}

function documentPath(storagePath: string): string {
  if (!/^[0-9a-f-]{36}\.enc$/i.test(storagePath)) throw new Error('Invalid stored document reference.');
  return path.join(documentDirectory(), storagePath);
}

export async function writeEncryptedDocument(storagePath: string, plaintext: Buffer): Promise<void> {
  const key = storageKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const payload = Buffer.concat([Buffer.from('TFO1'), iv, cipher.getAuthTag(), ciphertext]);
  const directory = documentDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(documentPath(storagePath), payload, { flag: 'wx', mode: 0o600 });
}

export async function readEncryptedDocument(storagePath: string): Promise<Buffer> {
  const key = storageKey();
  const payload = await readFile(documentPath(storagePath));
  if (payload.length < 32 || payload.subarray(0, 4).toString('ascii') !== 'TFO1') throw new Error('Stored document format is invalid.');
  const iv = payload.subarray(4, 16);
  const authTag = payload.subarray(16, 32);
  const ciphertext = payload.subarray(32);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function removeEncryptedDocument(storagePath: string): Promise<void> {
  try {
    await unlink(documentPath(storagePath));
  } catch {
    // Best-effort cleanup after failed database persistence.
  }
}
