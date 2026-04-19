import fs from 'fs/promises';
import path from 'path';
import { getJobUploadDir, getJobOutputDir, getClipsDir } from './paths';

export async function ensureJobDirectories(jobId: string): Promise<void> {
  const dirs = [
    getJobUploadDir(jobId),
    getJobOutputDir(jobId),
    getClipsDir(jobId),
  ];
  await Promise.all(dirs.map((d) => fs.mkdir(d, { recursive: true })));
}

export async function saveBuffer(buffer: Buffer, destPath: string): Promise<void> {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buffer);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}

export async function cleanupJob(jobId: string): Promise<void> {
  await Promise.allSettled([
    fs.rm(getJobUploadDir(jobId), { recursive: true, force: true }),
    fs.rm(getJobOutputDir(jobId), { recursive: true, force: true }),
  ]);
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

export function getVideoExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const allowed = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  return allowed.includes(ext) ? ext : 'mp4';
}
