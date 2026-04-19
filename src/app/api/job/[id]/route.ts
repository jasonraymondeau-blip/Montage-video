import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs/store';
import type { JobStatusResponse } from '@/types';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = getJob(params.id);

  if (!job) {
    return NextResponse.json({ error: 'Job introuvable' }, { status: 404 });
  }

  const response: JobStatusResponse = {
    id: job.id,
    status: job.status,
    steps: job.steps,
    analysis: job.status === 'analyzed' || job.status === 'generating' || job.status === 'complete'
      ? job.analysis
      : undefined,
    outputUrl: job.status === 'complete' ? `/api/video/${job.id}` : undefined,
    viralityScore: job.viralityScore,
    error: job.error,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache',
      'Pragma': 'no-cache',
    },
  });
}
