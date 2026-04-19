import { v4 as uuidv4 } from 'uuid';
import type { Job, JobStatus, JobStep, AnalysisResult, TemplateId, ViralityResult } from '@/types';

// In-memory job store — singleton across all Next.js API route invocations
// (acceptable for MVP; swap for Redis in production)
const jobs = new Map<string, Job>();

const STEP_NAMES = [
  'Analyse de la vidéo principale',
  'Détection des silences',
  'Transcription audio',
  'Analyse des vidéos de référence',
  'Sélection des clips',
  'Recadrage vertical 9:16',
  'Application des effets',
  'Génération des sous-titres',
  'Rendu final',
];

function buildSteps(names: string[]): JobStep[] {
  return names.map((name) => ({ name, status: 'pending', progress: 0 }));
}

export function createJob(
  mainVideoPath: string,
  referenceVideoPaths: string[],
): Job {
  const id = uuidv4();
  const now = Date.now();
  const job: Job = {
    id,
    status: 'uploaded',
    createdAt: now,
    updatedAt: now,
    steps: buildSteps(STEP_NAMES),
    mainVideoPath,
    referenceVideoPaths,
    template: 'tiktok',
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): void {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...updates, updatedAt: Date.now() });
}

export function setJobStatus(id: string, status: JobStatus, error?: string): void {
  updateJob(id, { status, ...(error ? { error } : {}) });
}

export function setJobAnalysis(id: string, analysis: AnalysisResult): void {
  updateJob(id, { status: 'analyzed', analysis });
}

export function setJobTemplate(id: string, template: TemplateId): void {
  updateJob(id, { template });
}

export function setJobOutput(
  id: string,
  outputPath: string,
  viralityScore: ViralityResult,
): void {
  updateJob(id, { status: 'complete', outputPath, viralityScore });
}

export function updateStep(
  jobId: string,
  stepName: string,
  update: Partial<JobStep>,
): void {
  const job = jobs.get(jobId);
  if (!job) return;
  const steps = job.steps.map((s) =>
    s.name === stepName ? { ...s, ...update } : s,
  );
  jobs.set(jobId, { ...job, steps, updatedAt: Date.now() });
}

export function markStepDone(jobId: string, stepName: string): void {
  updateStep(jobId, stepName, { status: 'done', progress: 100 });
}

export function markStepRunning(jobId: string, stepName: string, message?: string): void {
  updateStep(jobId, stepName, { status: 'running', progress: 0, message });
}

export function markStepError(jobId: string, stepName: string, message: string): void {
  updateStep(jobId, stepName, { status: 'error', message });
}

// Cleanup jobs older than TTL (call periodically in a real app)
export function cleanupOldJobs(ttlMs = 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - ttlMs;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) {
      jobs.delete(id);
    }
  }
}
