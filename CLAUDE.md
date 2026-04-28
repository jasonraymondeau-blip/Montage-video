# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check (tsc --noEmit)
```

There is no test suite.

## Environment

Copy `.env.example` to `.env.local` for local development. Key variables:

- `OPENAI_API_KEY` — Required for audio transcription (Whisper). Without it, transcription returns a fallback empty transcript.
- `UPLOAD_DIR` / `OUTPUT_DIR` — Defaults to `./uploads` / `./processed` locally, `/tmp/montage-uploads` / `/tmp/montage-processed` on Vercel.
- `TARGET_OUTPUT_DURATION_SEC` — Target reel length in seconds (default: 30).

## Architecture

This is a **Next.js 14 App Router** application that converts raw video footage into 9:16 short-form content (Instagram Reels / TikTok). The pipeline has two phases triggered by separate API routes.

### Two-phase pipeline

**Phase 1 — Analysis** (`POST /api/upload`):
- Saves uploaded files to disk, creates a `Job` record, then fires `runAnalysis()` via `waitUntil()` (non-blocking for the HTTP response).
- `runAnalysis` in `src/lib/montage/engine.ts` orchestrates: probe → detect silence → transcribe → analyze reference style → select segments → build subtitles.
- Result is stored in `job.analysis` (a JSON file in `JOBS_DIR`).

**Phase 2 — Generation** (`POST /api/generate/[id]`):
- User selects a template then triggers this endpoint.
- `runGeneration` in `src/lib/montage/engine.ts` orchestrates: crop to 9:16 → apply zoom/speed effects → generate ASS subtitles → render final MP4 with xfade transitions → compute virality score.

### Job state machine

Jobs live as JSON files in `/tmp/montage-jobs/jobs/{uuid}.json` (or `JOBS_DIR`). The `src/lib/jobs/store.ts` module provides synchronous read/write helpers — this design survives serverless cold starts between invocations.

States: `uploaded → analyzing → analyzed → generating → complete | error`

The frontend polls `GET /api/job/[id]` every 2 seconds and renders step-by-step progress.

### Key modules

| Path | Responsibility |
|------|---------------|
| `src/lib/montage/engine.ts` | Orchestrates both pipeline phases |
| `src/lib/montage/selector.ts` | Scores and picks the best video segments |
| `src/lib/montage/templates.ts` | Four built-in templates; `custom` merges from reference style |
| `src/lib/jobs/store.ts` | File-based job persistence |
| `src/lib/storage/paths.ts` | All file path generation (uploads, clips, audio, subtitles, output) |
| `src/lib/ffmpeg/render.ts` | Final composite with xfade + subtitle filter graph |
| `src/lib/ai/transcription.ts` | OpenAI Whisper; falls back gracefully when key is absent |
| `src/lib/ai/analyzer.ts` | Extracts `StyleProfile` from reference videos via FFprobe |
| `src/types/index.ts` | All shared TypeScript types |

### Templates

Four `TemplateId` values: `alex-hormozi`, `mrbeast`, `tiktok` (default), `custom`. The `custom` template derives its `cutInterval`, `transitions`, and `zoomIntensity` from uploaded reference videos by calling `applyStyleProfileToTemplate`. All other templates ignore the reference style.

### Deployment constraints

- Requires **Vercel Pro** for the 300-second function timeout on `/api/upload` and `/api/generate/[id]`. Hobby plan caps at 10s — video processing will time out.
- All file I/O uses `/tmp` on Vercel; jobs and media do not persist across deployments.
- `fluent-ffmpeg`, `sharp`, and FFmpeg installers are listed as `serverComponentsExternalPackages` in `next.config.js` to avoid bundling issues.

### Language note

Step names and user-facing error messages in the backend are written in French (e.g., `'Rendu final'`, `'Transcription audio'`). Keep this consistent when adding new pipeline steps.
