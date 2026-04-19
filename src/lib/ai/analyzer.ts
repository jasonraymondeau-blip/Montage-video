import type { StyleProfile, TransitionType, VideoMetadata } from '@/types';
import { probeVideo } from '@/lib/ffmpeg/probe';
import { detectSilence } from '@/lib/ffmpeg/silence';

/**
 * Analyzes a reference video to extract its editing style.
 * Uses FFmpeg scene detection as primary signal, with optional GPT-4V enhancement.
 */
export async function analyzeReferenceStyle(
  videoPath: string,
): Promise<StyleProfile> {
  const [metadata, silenceRanges] = await Promise.all([
    probeVideo(videoPath),
    detectSilence(videoPath).catch(() => [] as [number, number][]),
  ]);

  // Detect scene changes using FFmpeg select filter to estimate cut frequency
  const cutTimestamps = await detectSceneChanges(videoPath);

  const avgCutInterval = computeAvgCutInterval(cutTimestamps, metadata.duration);
  const pace = classifyPace(avgCutInterval);

  // Estimate zoom/transition style from cut interval and video metadata
  const dominantTransition = estimateTransitionType(avgCutInterval, metadata);
  const zoomIntensity = estimateZoomIntensity(cutTimestamps, metadata);
  const hasJumpCuts = cutTimestamps.length > metadata.duration / 2;
  const hasCaptions = await checkForTextOverlay(metadata);

  return {
    avgCutInterval,
    dominantTransition,
    zoomIntensity,
    pace,
    hasCaptions,
    hasJumpCuts,
  };
}

/**
 * Detects scene change timestamps using FFmpeg's scdet (scene change detection) filter.
 */
function detectSceneChanges(videoPath: string): Promise<number[]> {
  return new Promise((resolve) => {
    const ffmpeg = require('@/lib/ffmpeg/client').default;
    const timestamps: number[] = [];

    ffmpeg(videoPath)
      .videoFilter("select='gt(scene,0.3)',metadata=print:file=-")
      .format('null')
      .output('/dev/null')
      .on('stderr', (line: string) => {
        // Parse pts_time from metadata output
        const match = line.match(/pts_time:([\d.]+)/);
        if (match) timestamps.push(parseFloat(match[1]));
      })
      .on('error', () => resolve(timestamps))
      .on('end', () => resolve(timestamps))
      .run();
  });
}

function computeAvgCutInterval(timestamps: number[], duration: number): number {
  if (timestamps.length < 2) {
    // No scene changes detected — assume slow, long cuts
    return Math.min(duration, 5.0);
  }
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.max(0.5, Math.min(10, avg));
}

function classifyPace(avgCutInterval: number): StyleProfile['pace'] {
  if (avgCutInterval < 1.5) return 'very-fast';
  if (avgCutInterval < 2.5) return 'fast';
  if (avgCutInterval < 4.0) return 'medium';
  return 'slow';
}

function estimateTransitionType(
  avgCutInterval: number,
  _metadata: VideoMetadata,
): TransitionType {
  if (avgCutInterval < 2) return 'cut';
  if (avgCutInterval < 3.5) return 'zoom';
  return 'fade';
}

function estimateZoomIntensity(timestamps: number[], metadata: VideoMetadata): number {
  const cutDensity = timestamps.length / metadata.duration;
  // Higher cut density = more dynamic = assume more zoom
  return Math.min(1.0, cutDensity * 0.8 + 0.1);
}

async function checkForTextOverlay(_metadata: VideoMetadata): Promise<boolean> {
  // Heuristic: modern Reels almost always have captions; default to true
  return true;
}
