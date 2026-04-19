import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Job, JobStatus, JobStep, AnalysisResult, TemplateId, ViralityResult } from '@/types';

// File-based job store — works across serverless function invocations (Vercel /tmp)
const JOBS_DIR = path.join(process.env.JOBS_DIR ?? '/tmp', 'montage-jobs', 'jobs');

function ensureJobsDir(): void {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
}

function jobPath(id: string): string {
  return path.join(JOBS_DIR, `${id}.json`);
}

function readJob(id: string): Job | undefined {
  try {
    const raw = fs.readFileSync(jobPath(id), 'utf-8');
    return JSON.parse(raw) as Job;
  } catch {
    return undefined;
  }
}

function writeJob(job: Job): void {
  ensureJobsDir();
  fs.writeFileSync(jobPath(job.id), JSON.stringify(job), 'utf-8');
}

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

export function createJob(mainVideoPath: string, referenceVideoPaths: string[]): Job {
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
  writeJob(job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return readJob(id);
}

export function updateJob(id: string, updates: Partial<Job>): void {
  const job = readJob(id);
  if (!job) return;
  writeJob({ ...job, ...updates, updatedAt: Date.now() });
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

export function setJobOutput(id: string, outputPath: string, viralityScore: ViralityResult): void {
  updateJob(id, { status: 'complete', outputPath, viralityScore });
}

export function updateStep(jobId: string, stepName: string, update: Partial<JobStep>): void {
  const job = readJob(jobId);
  if (!job) return;
  const steps = job.steps.map((s) =>
    s.name === stepName ? { ...s, ...update } : s,
  );
  writeJob({ ...job, steps, updatedAt: Date.now() });
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
