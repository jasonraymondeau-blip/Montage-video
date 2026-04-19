import path from 'path';
import fs from 'fs/promises';
import type { Job, AnalysisResult, MontageTemplate, ClipInfo } from '@/types';
import {
  updateStep,
  markStepDone,
  markStepRunning,
  markStepError,
  setJobOutput,
  setJobStatus,
} from '@/lib/jobs/store';
import { probeVideo } from '@/lib/ffmpeg/probe';
import { detectSilence } from '@/lib/ffmpeg/silence';
import { extractAudioSafe } from '@/lib/ffmpeg/audio';
import { cropAndTrimSafe } from '@/lib/ffmpeg/crop';
import { applyZoomSafe, applySpeedSafe } from '@/lib/ffmpeg/effects';
import { generateAssContent } from '@/lib/ffmpeg/subtitles';
import { renderFinal } from '@/lib/ffmpeg/render';
import { transcribeAudio } from '@/lib/ai/transcription';
import { analyzeReferenceStyle } from '@/lib/ai/analyzer';
import { computeViralityScore } from '@/lib/ai/virality';
import { selectSegments } from './selector';
import { getTemplate, applyStyleProfileToTemplate } from './templates';
import {
  getJobUploadDir,
  getJobOutputDir,
  getClipsDir,
  getClipPath,
  getAudioPath,
  getSubtitlePath,
  getOutputVideoPath,
} from '@/lib/storage/paths';
import { writeTextFile } from '@/lib/storage/local';

const STEP = {
  ANALYZE_MAIN: 'Analyse de la vidéo principale',
  DETECT_SILENCE: 'Détection des silences',
  TRANSCRIBE: 'Transcription audio',
  ANALYZE_REFS: 'Analyse des vidéos de référence',
  SELECT_CLIPS: 'Sélection des clips',
  CROP: 'Recadrage vertical 9:16',
  EFFECTS: 'Application des effets',
  SUBTITLES: 'Génération des sous-titres',
  RENDER: 'Rendu final',
};

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;
const DEFAULT_TARGET_DURATION = 30;

/**
 * Full analysis pipeline: runs after upload, before user confirms generation.
 */
export async function runAnalysis(job: Job): Promise<AnalysisResult> {
  const jobId = job.id;

  try {
    setJobStatus(jobId, 'analyzing');

    // Step 1: Probe main video
    markStepRunning(jobId, STEP.ANALYZE_MAIN, 'Lecture des métadonnées vidéo...');
    const mainVideoMeta = await probeVideo(job.mainVideoPath);
    markStepDone(jobId, STEP.ANALYZE_MAIN);

    // Step 2: Detect silence
    markStepRunning(jobId, STEP.DETECT_SILENCE, 'Recherche des silences...');
    const silenceRanges = await detectSilence(job.mainVideoPath).catch(() => [] as [number, number][]);
    markStepDone(jobId, STEP.DETECT_SILENCE);

    // Step 3: Transcribe
    markStepRunning(jobId, STEP.TRANSCRIBE, 'Transcription de l\'audio...');
    const audioPath = getAudioPath(jobId);
    await extractAudioSafe(job.mainVideoPath, audioPath).catch(() => undefined);
    const transcript = await transcribeAudio(audioPath, mainVideoMeta.duration);
    markStepDone(jobId, STEP.TRANSCRIBE);

    // Step 4: Analyze reference videos
    markStepRunning(jobId, STEP.ANALYZE_REFS, 'Analyse du style des références...');
    const referenceStyles = await Promise.all(
      job.referenceVideoPaths.map((p) =>
        analyzeReferenceStyle(p).catch(() => null),
      ),
    );
    const validStyles = referenceStyles.filter(Boolean) as Awaited<ReturnType<typeof analyzeReferenceStyle>>[];
    const referenceStyle = mergeStyles(validStyles, job.template);
    markStepDone(jobId, STEP.ANALYZE_REFS);

    // Step 5: Select segments
    markStepRunning(jobId, STEP.SELECT_CLIPS, 'Sélection des meilleurs moments...');
    const targetDuration =
      parseInt(process.env.TARGET_OUTPUT_DURATION_SEC ?? '30') || DEFAULT_TARGET_DURATION;
    const { segments, subtitleLines } = selectSegments(
      transcript,
      silenceRanges,
      mainVideoMeta,
      targetDuration,
      referenceStyle.avgCutInterval,
    );
    markStepDone(jobId, STEP.SELECT_CLIPS);

    return {
      mainVideo: mainVideoMeta,
      transcript,
      segments,
      silenceRanges,
      referenceStyle,
      selectedSegments: segments,
      subtitleLines,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setJobStatus(jobId, 'error', message);
    throw err;
  }
}

/**
 * Full montage generation pipeline: crops, applies effects, renders final video.
 */
export async function runGeneration(job: Job, analysis: AnalysisResult): Promise<void> {
  const jobId = job.id;

  try {
    setJobStatus(jobId, 'generating');

    const rawTemplate = getTemplate(job.template);
    const template = applyStyleProfileToTemplate(rawTemplate, analysis.referenceStyle);

    // Step 6: Crop to 9:16
    markStepRunning(jobId, STEP.CROP, 'Recadrage en format vertical...');
    const clips = await cropSegments(jobId, job.mainVideoPath, analysis.selectedSegments);
    markStepDone(jobId, STEP.CROP);

    // Step 7: Apply zoom/speed effects
    markStepRunning(jobId, STEP.EFFECTS, 'Application des effets visuels...');
    const processedClips = await applyEffects(jobId, clips, template);
    markStepDone(jobId, STEP.EFFECTS);

    // Step 8: Generate subtitles
    let subtitlePath: string | undefined;
    markStepRunning(jobId, STEP.SUBTITLES, 'Génération des sous-titres...');
    if (analysis.subtitleLines.length > 0) {
      subtitlePath = getSubtitlePath(jobId);
      const assContent = generateAssContent(
        analysis.subtitleLines,
        template.subtitleStyle,
      );
      await writeTextFile(subtitlePath, assContent);
    }
    markStepDone(jobId, STEP.SUBTITLES);

    // Step 9: Render final video
    markStepRunning(jobId, STEP.RENDER, 'Encodage de la vidéo finale...');
    const outputPath = getOutputVideoPath(jobId);
    const transition = template.transitions[0] ?? 'cut';

    await renderFinal({
      clips: processedClips,
      subtitlePath,
      transition,
      transitionDuration: 0.3,
      outputPath,
      onProgress: (pct) => {
        updateStep(jobId, STEP.RENDER, { progress: pct });
      },
    });
    markStepDone(jobId, STEP.RENDER);

    // Compute virality score
    const outputDuration = processedClips.reduce((acc, c) => acc + c.duration, 0);
    const viralityScore = computeViralityScore({
      clipCount: processedClips.length,
      duration: outputDuration,
      hasHook: template.addHook,
      hasSubtitles: !!subtitlePath,
      zoomCount: Math.floor(processedClips.length / 2),
      transition,
      template: job.template,
    });

    setJobOutput(jobId, outputPath, viralityScore);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setJobStatus(jobId, 'error', message);
    throw err;
  }
}

async function cropSegments(
  jobId: string,
  mainVideoPath: string,
  segments: AnalysisResult['selectedSegments'],
): Promise<ClipInfo[]> {
  await fs.mkdir(getClipsDir(jobId), { recursive: true });

  const clips: ClipInfo[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const outputPath = getClipPath(jobId, i);

    await cropAndTrimSafe({
      inputPath: mainVideoPath,
      outputPath,
      start: seg.start,
      end: seg.end,
      targetWidth: TARGET_WIDTH,
      targetHeight: TARGET_HEIGHT,
    });

    clips.push({
      path: outputPath,
      duration: seg.end - seg.start,
      index: i,
    });
  }

  return clips;
}

async function applyEffects(
  jobId: string,
  clips: ClipInfo[],
  template: MontageTemplate,
): Promise<ClipInfo[]> {
  const processed: ClipInfo[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const applyZoom = template.zoomIntensity > 1.05 && i % 2 === 0;
    const applySpeed = template.speedFactor !== 1.0;

    if (!applyZoom && !applySpeed) {
      processed.push(clip);
      continue;
    }

    let currentPath = clip.path;

    if (applyZoom) {
      const zoomedPath = path.join(getClipsDir(jobId), `zoomed_${i}.mp4`);
      await applyZoomSafe({
        inputPath: currentPath,
        outputPath: zoomedPath,
        intensity: template.zoomIntensity,
      });
      currentPath = zoomedPath;
    }

    if (applySpeed) {
      const speedPath = path.join(getClipsDir(jobId), `speed_${i}.mp4`);
      await applySpeedSafe(currentPath, speedPath, template.speedFactor);
      currentPath = speedPath;
    }

    processed.push({ ...clip, path: currentPath });
  }

  return processed;
}

function mergeStyles(
  styles: Awaited<ReturnType<typeof analyzeReferenceStyle>>[],
  templateId: string,
): AnalysisResult['referenceStyle'] {
  if (styles.length === 0 || templateId !== 'custom') {
    // Return a sensible default if no reference styles
    return {
      avgCutInterval: 2.5,
      dominantTransition: 'cut',
      zoomIntensity: 0.3,
      pace: 'medium',
      hasCaptions: true,
      hasJumpCuts: false,
    };
  }

  const avg = (fn: (s: typeof styles[0]) => number) =>
    styles.reduce((acc, s) => acc + fn(s), 0) / styles.length;

  const mostCommonTransition = styles
    .map((s) => s.dominantTransition)
    .sort((a, b) => styles.filter((s) => s.dominantTransition === b).length - styles.filter((s) => s.dominantTransition === a).length)[0];

  const avgInterval = avg((s) => s.avgCutInterval);
  let pace: AnalysisResult['referenceStyle']['pace'];
  if (avgInterval < 1.5) pace = 'very-fast';
  else if (avgInterval < 2.5) pace = 'fast';
  else if (avgInterval < 4) pace = 'medium';
  else pace = 'slow';

  return {
    avgCutInterval: avgInterval,
    dominantTransition: mostCommonTransition ?? 'cut',
    zoomIntensity: avg((s) => s.zoomIntensity),
    pace,
    hasCaptions: styles.some((s) => s.hasCaptions),
    hasJumpCuts: styles.some((s) => s.hasJumpCuts),
  };
}
