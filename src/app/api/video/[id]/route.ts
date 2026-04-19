import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getJob } from '@/lib/jobs/store';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = getJob(params.id);

  if (!job || !job.outputPath) {
    return NextResponse.json({ error: 'Vidéo non disponible' }, { status: 404 });
  }

  if (!fs.existsSync(job.outputPath)) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
  }

  const stat = fs.statSync(job.outputPath);
  const fileSize = stat.size;
  const rangeHeader = request.headers.get('range');

  const filename = `reel-${params.id}.mp4`;

  if (rangeHeader) {
    // Support HTTP range requests for video seeking in browsers
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const fileStream = fs.createReadStream(job.outputPath, { start, end });

    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
      },
    });
  }

  const fileStream = fs.createReadStream(job.outputPath);

  return new NextResponse(fileStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function HEAD(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = getJob(params.id);

  if (!job?.outputPath || !fs.existsSync(job.outputPath)) {
    return new NextResponse(null, { status: 404 });
  }

  const stat = fs.statSync(job.outputPath);

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Length': String(stat.size),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    },
  });
}
