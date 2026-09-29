// Blender で モデルを つくって、gltf-transform で かるく する（models/*.glb）。
//   つかいかた（math-app フォルダで）: node blender/build.mjs         … ぜんぶ
//                                      node blender/build.mjs wakin   … なまえに wakin が はいる ものだけ
//   Blender の ばしょが ちがう ときは BLENDER=... を つける
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';

const BLENDER = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
// [スクリプト, でてくる ファイルの なまえ, スクリプトに わたす もの]
const MODELS = [
  ['blender/medaka.py', 'medaka', ['medaka']],
  ['blender/medaka.py', 'himedaka', ['himedaka']],
  ...[1, 2, 3].map((n) => ['blender/fishgen.py', `wakin_${n}`, ['wakin', n]]),
  ...[1, 2].map((n) => ['blender/fishgen.py', `ryukin_${n}`, ['ryukin', n]]),
  ...[1, 2].map((n) => ['blender/fishgen.py', `pinpon_${n}`, ['pinpon', n]]),
  ['blender/fishgen.py', 'demekin_1', ['demekin', 1]],
  ['blender/fishgen.py', 'tancho_1', ['tancho', 1]],
  ...[1, 2].map((n) => ['blender/fishgen.py', `betta_${n}`, ['betta', n]]),
  ...[1, 2].map((n) => ['blender/fishgen.py', `guppy_${n}`, ['guppy', n]]),
  ['blender/fishgen.py', 'neon_1', ['neon', 1]],
  ['blender/fishgen.py', 'angel_1', ['angel', 1]],
  ['blender/fishgen.py', 'arowana_1', ['arowana', 1], { tex: 2048 }],
  // すいそうの なかの もの（blender/props.py）
  ...['vallis', 'sword', 'cabomba', 'rocks', 'driftwood', 'shells', 'castle', 'ship', 'filter', 'heater', 'airpump', 'airstone', 'log', 'leaves', 'perch']
    .map((n) => ['blender/props.py', `prop_${n}`, [n]]),
  // むし（blender/insects.py）
  ...['kabuto', 'kanabun', 'kokuwa', 'nokogiri', 'miyama', 'ookuwa', 'ant', 'dango', 'larva', 'pupa'].map((n) => ['blender/insects.py', `bug_${n}`, [n]]),
  // こまかく つくる もの：がぞうを 1024 の まま のこす
  ...['caucasus', 'hercules'].map((n) => ['blender/insects.py', `bug_${n}`, [n], { tex: 1024 }]),
];

const only = process.argv[2];
for (const [script, name, args, opt = {}] of MODELS) {
  if (only && !name.includes(only)) continue;
  execFileSync(BLENDER, ['--background', '--python', script, '--', ...args.map(String)], { stdio: ['ignore', 'ignore', 'inherit'] });
  const raw = `models/${name}.raw.glb`;
  const out = `models/${name}.glb`;
  if (!existsSync(raw)) throw new Error(`${raw} が できなかった`);
  // meshopt：かたちを ちいさく、webp：がぞうを ちいさく（ふるい iPad の Safari も よめる）
  // join・instance・flatten は しない（パーツの なまえや ふしの いちで アプリが うごかすので、まとめられると こまる）
  execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'optimize', raw, out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', String(opt.tex || 512), '--simplify', 'false', '--join', 'false', '--instance', 'false', '--flatten', 'false'],
    { stdio: ['ignore', 'ignore', 'inherit'], shell: true });
  unlinkSync(raw);
  console.log(`${out}  ${Math.round(statSync(out).size / 1024)}KB`);
}
