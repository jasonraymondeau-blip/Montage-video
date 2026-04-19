import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createJob } from '@/lib/jobs/store';
import { ensureJobDirectories, saveBuffer, getVideoExtension } from '@/lib/storage/local';
import { getMainVideoPath, getRefVideoPath } from '@/lib/storage/paths';
import { runAnalysis } from '@/lib/montage/engine';
import { setJobAnalysis } from '@/lib/jobs/store';

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '500');
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/x-msvideo', 'video/avi'];

export const runtime = 'nodejs';

// Increase body size limit for video uploads
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const mainVideoFile = formData.get('mainVideo') as File | null;
    if (!mainVideoFile) {
      return NextResponse.json({ error: 'mainVideo est requis' }, { status: 400 });
    }

    if (!isAllowedVideoType(mainVideoFile)) {
      return NextResponse.json(
        { error: 'Format vidéo non supporté. Utilisez MP4 ou MOV.' },
        { status: 400 },
      );
    }

    if (mainVideoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Maximum ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 },
      );
    }

    // Collect reference videos (optional)
    const refFiles: File[] = [];
    for (let i = 0; i < 5; i++) {
      const ref = formData.get(`ref_${i}`) as File | null;
      if (ref && ref.size > 0) {
        if (!isAllowedVideoType(ref)) continue;
        refFiles.push(ref);
      }
    }
    // Also support referenceVideos[] array field name
    const refArray = formData.getAll('referenceVideos') as File[];
    for (const ref of refArray) {
      if (ref && ref.size > 0 && isAllowedVideoType(ref)) {
        refFiles.push(ref);
      }
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
      const refBuffer = Buffer.from(await ref.arrayBuffer());
      await saveBuffer(refBuffer, refPath);
      refPaths.push(refPath);
    }

    // Update job with actual file paths
    const { updateJob } = await import('@/lib/jobs/store');
    updateJob(jobId, { mainVideoPath, referenceVideoPaths: refPaths });

    const updatedJob = (await import('@/lib/jobs/store')).getJob(jobId)!;

    // Kick off analysis asynchronously (fire and forget)
    runAnalysis(updatedJob)
      .then((analysis) => setJobAnalysis(jobId, analysis))
      .catch((err) => {
        console.error(`[job:${jobId}] Analysis failed:`, err);
        const { setJobStatus } = require('@/lib/jobs/store');
        setJobStatus(jobId, 'error', err.message);
      });

    return NextResponse.json({ jobId }, { status: 201 });
  } catch (err) {
    console.error('[upload] Error:', err);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    );
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
