import { mkdir } from 'fs/promises';
import path from 'path';

export async function ensureTmpDirectory() {
  const tmpDir = path.join(process.cwd(), 'tmp');
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

export async function ensureTmpAnalysisDirectory() {
  const tmpDir = await ensureTmpDirectory();
  const analysisDir = path.join(tmpDir, 'analysis');
  await mkdir(analysisDir, { recursive: true });
  return analysisDir;
} 