# メダカ・ヒメダカの 3D モデルを Blender で つくって models/*.glb に かきだす。
#   つかいかた（math-app フォルダで）:
#     "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python blender/medaka.py -- medaka
#     （さいごの medaka を himedaka に すると ヒメダカ）
#   そのあと npm run models（gltf-transform で かるく する）
#
# アプリ（three.js）での きまり：
#   ・ながさ 1。はなさき z=+0.5、おびれの さき z=-0.5、せなかが +y
#   ・メッシュの なまえ：body（からだ）、fins（ひれ ぜんぶ）、iris（め）、pupil（くろめ）
#   ・fins の uv.y は ひれの ねもと 0 → さき 1（アプリで ひれの さきを ひらひら させる）
#   glTF は Y が うえ・Blender は Z が うえ なので、P() で おきかえる。

import math
import os
import sys

import bmesh
import bpy
import numpy as np

VARIANT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'medaka'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'models', f'{VARIANT}.raw.glb')
rng = np.random.default_rng(7 if VARIANT == 'medaka' else 11)


def P(x, y, z):
    """アプリの ざひょう（x よこ・y うえ・z まえ）→ Blender の ざひょう"""
    return (x, -z, y)


# ---------- からだの かたち ----------
# s：0 おびれの ねもと → 1 はなさき。数字は ぜんたいの ながさ 1 に たいする わりあい
ZT = -0.3  # からだが おわる ところ（ここから うしろが おびれ）
S_PTS = [0.0, 0.08, 0.2, 0.35, 0.5, 0.62, 0.72, 0.8, 0.87, 0.92, 0.96, 0.985, 1.0]
TOP = [0.026, 0.03, 0.043, 0.058, 0.066, 0.068, 0.066, 0.06, 0.05, 0.04, 0.028, 0.018, 0.012]   # せなか（たいら）
BOT = [-0.026, -0.031, -0.05, -0.074, -0.09, -0.094, -0.09, -0.078, -0.06, -0.045, -0.028, -0.012, 0.0]  # おなか（まるい）
WID = [0.01, 0.013, 0.024, 0.036, 0.045, 0.049, 0.05, 0.049, 0.045, 0.037, 0.026, 0.013, 0.002]


def curve(pts, s):
    # なめらかに つなぐ（エルミート補間）
    return float(np.interp(s, S_PTS, pts)) if s <= 0 or s >= 1 else _smooth(pts, s)


def _smooth(pts, s):
    i = max(0, min(len(S_PTS) - 2, int(np.searchsorted(S_PTS, s) - 1)))
    x0, x1 = S_PTS[i], S_PTS[i + 1]
    t = (s - x0) / (x1 - x0)
    def slope(k):
        a = max(0, k - 1)
        b = min(len(S_PTS) - 1, k + 1)
        return (pts[b] - pts[a]) / (S_PTS[b] - S_PTS[a])
    m0 = slope(i) * (x1 - x0)
    m1 = slope(i + 1) * (x1 - x0)
    h00 = 2 * t ** 3 - 3 * t ** 2 + 1
    h10 = t ** 3 - 2 * t ** 2 + t
    h01 = -2 * t ** 3 + 3 * t ** 2
    h11 = t ** 3 - t ** 2
    return h00 * pts[i] + h10 * m0 + h01 * pts[i + 1] + h11 * m1


def top(s): return curve(TOP, s)
def bot(s): return curve(BOT, s)
def wid(s):
    w = curve(WID, s)
    return w * (1 + 0.06 * math.exp(-((s - 0.8) / 0.03) ** 2))  # えらぶたの ふくらみ
def Z(s): return ZT + s * (0.5 - ZT)


def section(s, a):
    """わぎりの てん。a：0 せなか → π おなか → 2π。せなかは たいらに、おなかは まるく"""
    c = math.cos(a)
    sn = math.sin(a)
    mid = (top(s) + bot(s)) / 2
    half = (top(s) - bot(s)) / 2
    y = mid + half * (math.copysign(abs(c) ** 0.85, c))
    x = wid(s) * math.copysign(abs(sn) ** 0.8, sn)
    return x, y, Z(s)


# ---------- テクスチャ（numpy で えがく） ----------

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def stamp_dots(img, n, weight, color, rad, alpha):
    h, w, _ = img.shape
    placed = 0
    tries = 0
    while placed < n and tries < n * 20:
        tries += 1
        px, py = rng.random() * w, rng.random() * h
        if rng.random() > weight(px / w, py / h):
            continue
        r = rad[0] + rng.random() * (rad[1] - rad[0])
        x0, x1 = int(px - r - 1), int(px + r + 2)
        y0, y1 = int(py - r - 1), int(py + r + 2)
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                d = math.hypot(xx - px, yy - py) / r
                if d >= 1:
                    continue
                k = alpha * (1 - d * d)
                img[yy % h, xx % w, :3] = img[yy % h, xx % w, :3] * (1 - k) + np.array(color) * k
        placed += 1


def body_texture(W=512, H=256):
    u = (np.arange(W) + 0.5) / W        # s（おびれ → はなさき）
    v = (np.arange(H) + 0.5) / H        # a / 2π
    S, Vv = np.meshgrid(u, v)
    A = Vv * 2 * math.pi
    d = (1 + np.cos(A)) / 2              # 1 せなか → 0 おなか
    if VARIANT == 'medaka':
        back, side, belly = np.array([0.40, 0.38, 0.26]), np.array([0.66, 0.64, 0.54]), np.array([0.90, 0.90, 0.87])
    else:
        back, side, belly = np.array([0.95, 0.56, 0.18]), np.array([0.99, 0.74, 0.42]), np.array([1.0, 0.93, 0.82])
    k1 = smoothstep(0.28, 0.52, d)[..., None]
    k2 = smoothstep(0.55, 0.9, d)[..., None]
    col = belly * (1 - k1) + side * k1
    col = col * (1 - k2) + back * k2
    # うろこの あみめ（かすかに）
    f = (S * 34 + 0.5 * (np.floor(Vv * 28) % 2)) % 1
    g = (Vv * 28) % 1
    edge = np.minimum(np.minimum(f, 1 - f), np.minimum(g, 1 - g))
    col *= (0.9 + 0.1 * smoothstep(0.0, 0.22, edge))[..., None] * (0.6 + 0.4 * d[..., None]) + (1 - (0.6 + 0.4 * d[..., None]))
    # えらぶたの ぎんいろ
    gd = ((S - 0.81) / 0.045) ** 2 + ((d - 0.45) / 0.2) ** 2
    gill = (np.exp(-gd * 1.5) * 0.4)[..., None]
    col = col * (1 - gill) + np.array([0.8, 0.86, 0.9]) * gill
    # あたまの うえは すこし こく、はなさきは くろっぽい（くち）
    col *= (1 - 0.18 * (smoothstep(0.84, 0.95, S) * smoothstep(0.6, 0.9, d)))[..., None]
    col *= (1 - 0.45 * smoothstep(0.975, 0.995, S))[..., None]
    img = np.concatenate([np.clip(col, 0, 1), np.ones((H, W, 1))], axis=2)
    if VARIANT == 'medaka':
        # せなかの まんなかの くろい すじ、よこの すじ（うしろ はんぶん）
        stripe = smoothstep(0.985, 0.998, d) * smoothstep(0.08, 0.15, S) * smoothstep(0.86, 0.78, S)
        lateral = smoothstep(0.035, 0.008, np.abs(d - 0.5)) * smoothstep(0.08, 0.14, S) * smoothstep(0.6, 0.45, S)
        dark = np.clip(stripe * 0.6 + lateral * 0.35, 0, 1)[..., None]
        img[..., :3] = img[..., :3] * (1 - dark) + np.array([0.12, 0.1, 0.07]) * dark
        # こくしょくほう（くろい てんてん）：せなかに おおく、おなかには ない
        stamp_dots(img, 5200, lambda x, y: float(smoothstep(0.4, 0.95, (1 + math.cos(y * 2 * math.pi)) / 2)),
                   [0.13, 0.11, 0.08], (0.7, 1.9), 0.75)
    else:
        stamp_dots(img, 900, lambda x, y: float(smoothstep(0.5, 0.95, (1 + math.cos(y * 2 * math.pi)) / 2)),
                   [0.72, 0.36, 0.1], (0.7, 1.6), 0.4)
    return img


def fin_texture(W=256, H=128):
    u = (np.arange(W) + 0.5) / W
    v = (np.arange(H) + 0.5) / H        # v=1 ねもと、v=0 さき（Blender の uv）
    U, Vv = np.meshgrid(u, v)
    r = 1 - Vv                           # ねもと 0 → さき 1
    base = np.array([0.86, 0.82, 0.62]) if VARIANT == 'medaka' else np.array([0.99, 0.78, 0.5])
    f = (U * 8) % 1
    ray = smoothstep(0.12, 0.02, np.minimum(f, 1 - f))  # 8ほんの すじ
    col = np.ones((H, W, 3)) * base
    col *= (1 - 0.25 * ray)[..., None]
    col = col * (1 - smoothstep(0.85, 1.0, r)[..., None] * 0.4) + np.array([0.97, 0.97, 0.95]) * smoothstep(0.85, 1.0, r)[..., None] * 0.4
    alpha = (0.62 - 0.4 * r) + 0.18 * ray
    img = np.concatenate([np.clip(col, 0, 1), np.clip(alpha, 0, 1)[..., None]], axis=2)
    if VARIANT == 'medaka':
        stamp_dots(img, 380, lambda x, y: 0.6, [0.2, 0.17, 0.12], (0.6, 1.3), 0.5)
    return img


def make_image(name, arr):
    h, w, _ = arr.shape
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.pack()
    return img


def make_material(name, image=None, color=(1, 1, 1, 1), rough=0.4, metal=0.0, alpha=False):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if image:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = image
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        if alpha:
            nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    if alpha:
        if hasattr(m, 'surface_render_method'):
            m.surface_render_method = 'BLENDED'
        if hasattr(m, 'blend_method'):
            m.blend_method = 'BLEND'
    return m


# ---------- メッシュ ----------

def new_object(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def build_body(material):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    N, M = 70, 36
    ss = [1 - (1 - i / N) ** 1.2 for i in range(N)]  # あたまの ほうを こまかく
    rings = []
    for s in ss:
        rings.append([bm.verts.new(P(*section(s, 2 * math.pi * j / M))) for j in range(M)])
    snout = bm.verts.new(P(0, (top(1) + bot(1)) / 2, 0.5))
    tail = bm.verts.new(P(0, (top(0) + bot(0)) / 2, Z(0) - 0.002))
    def uv(s, j):
        return (s, j / M)
    for i in range(N - 1):
        for j in range(M):
            j1 = j + 1
            f = bm.faces.new((rings[i][j], rings[i][j1 % M], rings[i + 1][j1 % M], rings[i + 1][j]))
            for loop, (si, jj) in zip(f.loops, [(ss[i], j), (ss[i], j1), (ss[i + 1], j1), (ss[i + 1], j)]):
                loop[uvl].uv = uv(si, jj)
    for j in range(M):
        j1 = j + 1
        f = bm.faces.new((rings[-1][j], rings[-1][j1 % M], snout))
        for loop, (si, jj) in zip(f.loops, [(ss[-1], j), (ss[-1], j1), (1.0, j + 0.5)]):
            loop[uvl].uv = uv(si, jj)
        f = bm.faces.new((rings[0][j1 % M], rings[0][j], tail))
        for loop, (si, jj) in zip(f.loops, [(0, j1), (0, j), (0, j + 0.5)]):
            loop[uvl].uv = uv(si, jj)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_object('body', bm, material)


def fin_strip(bm, uvl, base, edge, n=12, m=6, rays=1.0, curve_fn=None):
    grid = []
    for i in range(n + 1):
        s = i / n
        b = base(s)
        e = edge(s)
        cv = curve_fn(s) if curve_fn else (0, 0, 0)
        row = []
        for j in range(m + 1):
            q = j / m
            p = [b[k] + (e[k] - b[k]) * q + cv[k] * q * q for k in range(3)]
            row.append((bm.verts.new(P(*p)), (s * rays, 1 - q)))
        grid.append(row)
    for i in range(n):
        for j in range(m):
            cs = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
            f = bm.faces.new([c[0] for c in cs])
            for loop, c in zip(f.loops, cs):
                loop[uvl].uv = c[1]


def build_fins(material):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    # せびれ：からだの うしろの ほうに ちいさく
    fin_strip(bm, uvl,
              lambda s: (0, top(0.13 + 0.1 * s) - 0.002, Z(0.13 + 0.1 * s)),
              lambda s: (0, top(0.13 + 0.1 * s) + 0.062 * math.sin(math.pi * (0.1 + 0.9 * s)) ** 0.5 * (0.7 + 0.3 * s),
                         Z(0.13 + 0.1 * s) - 0.03 - 0.015 * s), n=8, m=6, rays=0.9)
    # しりびれ：ながい（オスは ひしがた）
    fin_strip(bm, uvl,
              lambda s: (0, bot(0.08 + 0.4 * s) + 0.002, Z(0.08 + 0.4 * s)),
              lambda s: (0, bot(0.08 + 0.4 * s) - (0.06 - 0.02 * s) * math.sin(math.pi * (0.05 + 0.95 * s)) ** 0.25,
                         Z(0.08 + 0.4 * s) - 0.03), n=18, m=6, rays=2.2)
    # おびれ：うしろが まっすぐ（すこし まるい）
    fin_strip(bm, uvl,
              lambda s: (0, bot(0.02) + (top(0.02) - bot(0.02)) * s + 0.002 * math.sin(math.pi * s), Z(0.02)),
              lambda s: (0, (top(0) + bot(0)) / 2 + 0.078 * (2 * s - 1), -0.5 + 0.02 * (1 - math.sin(math.pi * s)) - 0.012 * math.sin(math.pi * s)),
              n=16, m=8, rays=1.6)
    # むなびれ：からだの よこの たかい ところ
    for side in (1, -1):
        s0 = 0.765
        bx = side * wid(s0) * 0.92
        by = (top(s0) + bot(s0)) / 2 + 0.012
        fin_strip(bm, uvl,
                  lambda s, bx=bx, by=by: (bx, by - 0.006 + 0.012 * s, Z(s0) - 0.003 * s),
                  lambda s, bx=bx, by=by, side=side: (bx + side * 0.016, by - 0.022 + 0.04 * s,
                                                      Z(s0) - 0.05 - 0.012 * math.sin(math.pi * s)),
                  n=8, m=5, rays=0.8)
    # はらびれ
    for side in (1, -1):
        s0 = 0.5
        bx = side * wid(s0) * 0.35
        by = bot(s0) + 0.006
        fin_strip(bm, uvl,
                  lambda s, bx=bx, by=by: (bx, by, Z(s0) - 0.02 * s),
                  lambda s, bx=bx, by=by, side=side: (bx + side * 0.01, by - 0.035 * (1 - 0.5 * s), Z(s0) - 0.035 - 0.02 * s),
                  n=4, m=4, rays=0.5)
    return new_object('fins', bm, material)


def build_eyes(iris_mat, pupil_mat):
    s0 = 0.895
    er = 0.034
    objs = []
    for part, mat in (('iris', iris_mat), ('pupil', pupil_mat)):
        bm = bmesh.new()
        for side in (1, -1):
            x = side * wid(s0) * 0.84
            y = (top(s0) + bot(s0)) / 2 + (top(s0) - bot(s0)) / 2 * 0.3
            if part == 'iris':
                c, sc = (x - side * er * 0.12, y, Z(s0)), (er * 0.24, er, er)
            else:
                c, sc = (x + side * er * 0.02, y, Z(s0) + 0.002), (er * 0.2, er * 0.55, er * 0.55)
            geom = bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
            vs = geom['verts']
            for v in vs:
                lx, ly, lz = v.co.x, v.co.z, -v.co.y  # Blender → アプリ（まるいので むきは きにしない）
                v.co = P(c[0] + lx * sc[0], c[1] + ly * sc[1], c[2] + lz * sc[2])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        objs.append(new_object(part, bm, mat))
    return objs


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    body_img = make_image(f'{VARIANT}_body', body_texture())
    fin_img = make_image(f'{VARIANT}_fin', fin_texture())
    body_mat = make_material('body', body_img, rough=0.38, metal=0.08)
    fin_mat = make_material('fin', fin_img, rough=0.5, alpha=True)
    iris = make_material('iris', color=(0.62, 0.64, 0.56, 1) if VARIANT == 'medaka' else (0.8, 0.72, 0.55, 1), rough=0.35, metal=0.6)
    pupil = make_material('pupil', color=(0.01, 0.01, 0.01, 1), rough=0.05)
    build_body(body_mat)
    build_fins(fin_mat)
    build_eyes(iris, pupil)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
    print('EXPORTED', OUT, os.path.getsize(OUT))


main()
