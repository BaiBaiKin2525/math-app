// Blender で モデルを つくって、gltf-transform で かるく する（models/*.glb）。
//   つかいかた（math-app フォルダで）: node blender/build.mjs
//   Blender の ばしょが ちがう ときは BLENDER=... を つける
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';

const BLENDER = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
// [スクリプト, しゅるい]
const MODELS = [
  ['blender/medaka.py', 'medaka'],
  ['blender/medaka.py', 'himedaka'],
];

for (const [script, name] of MODELS) {
  execFileSync(BLENDER, ['--background', '--python', script, '--', name], { stdio: ['ignore', 'ignore', 'inherit'] });
  const raw = `models/${name}.raw.glb`;
  const out = `models/${name}.glb`;
  if (!existsSync(raw)) throw new Error(`${raw} が できなかった`);
  // meshopt：かたちを ちいさく、webp：がぞうを ちいさく（ふるい iPad の Safari も よめる）
  execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'optimize', raw, out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '512', '--simplify', 'false'],
    { stdio: ['ignore', 'ignore', 'inherit'], shell: true });
  unlinkSync(raw);
  console.log(`${out}  ${Math.round(statSync(out).size / 1024)}KB`);
}
