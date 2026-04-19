import path from 'path';

const BASE_UPLOAD = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

const BASE_OUTPUT = process.env.OUTPUT_DIR
  ? path.resolve(process.env.OUTPUT_DIR)
  : path.resolve(process.cwd(), 'processed');

export const getUploadDir = () => BASE_UPLOAD;
export const getOutputDir = () => BASE_OUTPUT;

export const getJobUploadDir = (jobId: string) =>
  path.join(BASE_UPLOAD, jobId);

export const getJobOutputDir = (jobId: string) =>
  path.join(BASE_OUTPUT, jobId);

export const getMainVideoPath = (jobId: string, ext = 'mp4') =>
  path.join(BASE_UPLOAD, jobId, `main.${ext}`);

export const getRefVideoPath = (jobId: string, index: number, ext = 'mp4') =>
  path.join(BASE_UPLOAD, jobId, `ref_${index}.${ext}`);

export const getClipsDir = (jobId: string) =>
  path.join(BASE_OUTPUT, jobId, 'clips');

export const getClipPath = (jobId: string, index: number) =>
  path.join(BASE_OUTPUT, jobId, 'clips', `clip_${index}.mp4`);

export const getSubtitlePath = (jobId: string) =>
  path.join(BASE_OUTPUT, jobId, 'subtitles.ass');

export const getOutputVideoPath = (jobId: string) =>
  path.join(BASE_OUTPUT, jobId, 'output.mp4');

export const getAudioPath = (jobId: string) =>
  path.join(BASE_OUTPUT, jobId, 'audio.wav');
