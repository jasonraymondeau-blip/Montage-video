import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { waitUntil } from '@vercel/functions';
import { createJob, updateJob, getJob, setJobAnalysis, setJobStatus } from '@/lib/jobs/store';
import { ensureJobDirectories, saveBuffer, getVideoExtension } from '@/lib/storage/local';
import { getMainVideoPath, getRefVideoPath } from '@/lib/storage/paths';
import { runAnalysis } from '@/lib/montage/engine';

// Allow up to 300s for video processing (requires Vercel Pro; Hobby is capped at 10s)
export const maxDuration = 300;
export const runtime = 'nodejs';

// Vercel Hobby plan limits: 4.5MB body, 10s timeout
// Vercel Pro plan limits: no body limit, 300s timeout
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '100');
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/x-msvideo', 'video/avi'];

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Fichier trop volumineux ou format invalide. Essaie une vidéo de moins de 50MB.' },
        { status: 413 },
      );
    }

    const mainVideoFile = formData.get('mainVideo') as File | null;
    if (!mainVideoFile) {
      return NextResponse.json({ error: 'mainVideo est requis' }, { status: 400 });
    }

    if (!isAllowedVideoType(mainVideoFile)) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez MP4 ou MOV.' },
        { status: 400 },
      );
    }

    if (mainVideoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(mainVideoFile.size / 1024 / 1024).toFixed(1)}MB). Maximum ${MAX_FILE_SIZE_MB}MB sur ce plan.` },
        { status: 413 },
      );
    }

    // Collect reference videos (optional, max 5)
    const refFiles: File[] = [];
    for (let i = 0; i < 5; i++) {
      const ref = formData.get(`ref_${i}`) as File | null;
      if (ref && ref.size > 0 && isAllowedVideoType(ref)) refFiles.push(ref);
    }
    const refArray = formData.getAll('referenceVideos') as File[];
    for (const ref of refArray) {
      if (ref && ref.size > 0 && isAllowedVideoType(ref)) refFiles.push(ref);
    }

    // Create job and directories
    const job = createJob('', []);
    const jobId = job.id;
    await ensureJobDirectories(jobId);

    // Save main video
    const mainExt = getVideoExtension(mainVideoFile.name);
    const mainVideoPath = getMainVideoPath(jobId, mainExt);
    const mainBuffer = Buffer.from(await mainVideoFile.arrayBuffer());
    await saveBuffer(mainBuffer, mainVideoPath);

    // Save reference videos
    const refPaths: string[] = [];
    for (let i = 0; i < refFiles.length; i++) {
      const ref = refFiles[i];
      const refExt = getVideoExtension(ref.name);
      const refPath = getRefVideoPath(jobId, i, refExt);
      await saveBuffer(Buffer.from(await ref.arrayBuffer()), refPath);
      refPaths.push(refPath);
    }

    updateJob(jobId, { mainVideoPath, referenceVideoPaths: refPaths });
    const updatedJob = getJob(jobId)!;

    // Use waitUntil to keep the serverless function alive after response
    waitUntil(
      runAnalysis(updatedJob)
        .then((analysis) => setJobAnalysis(jobId, analysis))
        .catch((err: Error) => {
          console.error(`[job:${jobId}] Analysis failed:`, err);
          setJobStatus(jobId, 'error', err.message);
        }),
    );

    return NextResponse.json({ jobId }, { status: 201 });
  } catch (err) {
    console.error('[upload] Error:', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isAllowedVideoType(file: File): boolean {
  const type = file.type.toLowerCase();
  const ext = path.extname(file.name).toLowerCase();
  return (
    ALLOWED_TYPES.includes(type) ||
    ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)
  );
}
