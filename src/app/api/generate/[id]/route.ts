import { NextRequest, NextResponse } from 'next/server';
import { getJob, setJobTemplate } from '@/lib/jobs/store';
import { runGeneration } from '@/lib/montage/engine';
import type { GenerateRequest, TemplateId } from '@/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = getJob(params.id);

  if (!job) {
    return NextResponse.json({ error: 'Job introuvable' }, { status: 404 });
  }

  if (job.status !== 'analyzed') {
    return NextResponse.json(
      { error: `Impossible de générer : statut actuel "${job.status}"` },
      { status: 400 },
    );
  }

  if (!job.analysis) {
    return NextResponse.json(
      { error: 'Analyse non disponible' },
      { status: 400 },
    );
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    body = { template: 'tiktok', targetDuration: 30 };
  }

  const validTemplates: TemplateId[] = ['alex-hormozi', 'mrbeast', 'tiktok', 'custom'];
  const template: TemplateId = validTemplates.includes(body.template as TemplateId)
    ? (body.template as TemplateId)
    : 'tiktok';

  setJobTemplate(params.id, template);

  // Get updated job with template set
  const updatedJob = getJob(params.id)!;

  // Kick off generation asynchronously
  runGeneration(updatedJob, job.analysis).catch((err) => {
    console.error(`[job:${params.id}] Generation failed:`, err);
  });

  return NextResponse.json({ status: 'generating' }, { status: 202 });
}
