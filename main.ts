// LUMENHOLD's entrypoint (Node 22, standard library only): hands the game in. It
// copies this repository's game/ and screenshots/ into the grader's /output and writes
// /output/dossier.json with the vendored make.fun library, so the judge reads exactly
// what the scorer rebuilds from the same files. Outside the grader, set
// MAKEFUN_OUTPUT_DIR to stand in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The same caps the scorer's gate uses: text_max_bytes shapes the dossier's bytes,
// the rest refuse an entry the scorer would refuse (a screenshot over 256 KiB or more
// than 4 of them; game/ past 993 entries or 48 MiB, or a path over 1000 bytes).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
