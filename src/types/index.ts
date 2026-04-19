// ─── Job types ───────────────────────────────────────────────────────────────

export type JobStatus =
  | 'uploaded'
  | 'analyzing'
  | 'analyzed'
  | 'generating'
  | 'complete'
  | 'error';

export interface JobStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  message?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  steps: JobStep[];
  mainVideoPath: string;
  referenceVideoPaths: string[];
  analysis?: AnalysisResult;
  template: TemplateId;
  outputPath?: string;
  viralityScore?: ViralityResult;
  error?: string;
}

// ─── Video analysis types ─────────────────────────────────────────────────────

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  bitrate?: number;
  codec?: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  isKeyword: boolean;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

export interface VideoSegment {
  start: number;
  end: number;
  score: number;
  type: 'speech' | 'action' | 'silence' | 'mixed';
}

export interface StyleProfile {
  avgCutInterval: number;
  dominantTransition: TransitionType;
  zoomIntensity: number;
  pace: 'slow' | 'medium' | 'fast' | 'very-fast';
  hasCaptions: boolean;
  hasJumpCuts: boolean;
}

export interface SubtitleLine {
  start: number;
  end: number;
  text: string;
  highlightWords: string[];
  style: 'normal' | 'highlight' | 'hook';
}

export interface AnalysisResult {
  mainVideo: VideoMetadata;
  transcript: TranscriptSegment[];
  segments: VideoSegment[];
  silenceRanges: [number, number][];
  referenceStyle: StyleProfile;
  selectedSegments: VideoSegment[];
  subtitleLines: SubtitleLine[];
}

// ─── Template & Montage types ─────────────────────────────────────────────────

export type TransitionType = 'cut' | 'fade' | 'zoom' | 'wipe';

export type TemplateId = 'alex-hormozi' | 'mrbeast' | 'tiktok' | 'custom';

export interface SubtitleStyle {
  primaryColor: string;
  outlineColor: string;
  bold: boolean;
  fontSize: number;
  alignment: 'bottom' | 'center';
  wordByWord: boolean;
}

export interface MontageTemplate {
  id: TemplateId;
  name: string;
  description: string;
  cutInterval: number;
  transitions: TransitionType[];
  subtitleStyle: SubtitleStyle;
  zoomIntensity: number;
  speedFactor: number;
  addHook: boolean;
  hookDuration: number;
}

// ─── Virality score ───────────────────────────────────────────────────────────

export interface ViralityBreakdown {
  cutRate: number;
  duration: number;
  hook: number;
  subtitles: number;
  zoomEffects: number;
  clipVariety: number;
  audioSync: number;
}

export interface ViralityResult {
  score: number;
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'S';
  breakdown: ViralityBreakdown;
  tips: string[];
}

// ─── API response types ───────────────────────────────────────────────────────

export interface UploadResponse {
  jobId: string;
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  steps: JobStep[];
  analysis?: AnalysisResult;
  outputUrl?: string;
  viralityScore?: ViralityResult;
  error?: string;
}

export interface GenerateRequest {
  template: TemplateId;
  targetDuration: number;
}

// ─── FFmpeg processing types ──────────────────────────────────────────────────

export interface ClipInfo {
  path: string;
  duration: number;
  index: number;
}

export interface RenderOptions {
  clips: ClipInfo[];
  subtitlePath?: string;
  transition: TransitionType;
  transitionDuration: number;
  outputPath: string;
  onProgress?: (percent: number) => void;
}

export interface CropOptions {
  inputPath: string;
  outputPath: string;
  start: number;
  end: number;
  targetWidth: number;
  targetHeight: number;
}

export interface ZoomOptions {
  inputPath: string;
  outputPath: string;
  intensity: number;
}
