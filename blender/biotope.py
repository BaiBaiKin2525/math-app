# ビオトープの 3D を Blender で つくって models/bio_*.glb に かきだす。
#   つかいかた（math-app フォルダで）:
#     "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python blender/biotope.py -- terrain
#     しゅるい：terrain（じめん・みず・ふた）・props（すいしゃ・いわ・き・あし など）・animals（いきもの）
#   ふつうは node blender/build.mjs bio で ぜんぶ つくる
#
# アプリ（bio3d.js）での きまり：
#   ・ざひょうは x よこ（-8〜8）、y うえ、z てまえ（-5.5 おく 〜 5.5 てまえ）。1 ＝ やく 1m（いきものは みやすい ように おおきめ）
#   ・へいめんず：おくに 大きな き、ひだりおくの わき水 → せせらぎ（すいしゃ）→ 大きな いけ（みぎ）、
#     ひだりてまえに しっち、てまえから いけへ もくどう、みぎぎしに すなはま、みぎてまえに ながれだし
#   ・terrain：terrain（じめん）、water_pond・water_stream・water_wet（みずめん）、
#     cover_pond・cover_stream（まだ ひろげていない ところを くさで かくす ふた）
#   ・props：world_*（その ばしょに おく もの）と、ならべる もの（tree0 など）。すいしゃは wheel_pivot を まわす
#   ・animals：<しゅるい>_<すがた>。しっぽは tail（から）の したに あり、ゆらす

import math
import os
import sys

import bmesh
import bpy
import numpy as np

KIND = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'terrain'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'models', f'bio_{KIND}.raw.glb')
rng = np.random.default_rng(20261002)


def P(x, y, z):
    """アプリの ざひょう（x よこ・y うえ・z てまえ）→ Blender の ざひょう"""
    return (x, -z, y)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def norm(v):
    v = np.asarray(v, dtype=float)
    return v / (np.linalg.norm(v) + 1e-9)


def value_noise(W, H, cells, seed=0):
    r = np.random.default_rng(seed)
    g = r.random((cells + 1, cells + 1))
    ys = np.arange(H) / H * cells
    xs = np.arange(W) / W * cells
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    ty = ys - y0
    tx = xs - x0
    ty = ty * ty * (3 - 2 * ty)
    tx = tx * tx * (3 - 2 * tx)
    top = g[y0][:, x0] * (1 - tx) + g[y0][:, x0 + 1] * tx
    bot = g[y0 + 1][:, x0] * (1 - tx) + g[y0 + 1][:, x0 + 1] * tx
    return top * (1 - ty[:, None]) + bot * ty[:, None]


def noise2(x, z, scale, seed):
    """どこでも おなじ あたいに なる なめらかな ノイズ（x, z は 配列）"""
    r = np.random.default_rng(seed)
    k = r.random((64, 64))
    u = (np.asarray(x) / scale) % 63
    v = (np.asarray(z) / scale) % 63
    u0 = np.floor(u).astype(int)
    v0 = np.floor(v).astype(int)
    fu = u - u0
    fv = v - v0
    fu = fu * fu * (3 - 2 * fu)
    fv = fv * fv * (3 - 2 * fv)
    a = k[v0, u0] * (1 - fu) + k[v0, u0 + 1] * fu
    b = k[v0 + 1, u0] * (1 - fu) + k[v0 + 1, u0 + 1] * fu
    return a * (1 - fv) + b * fv


# ---------- へいめんず（アプリの bio3d.js と おなじ かず） ----------
POND = dict(c=(2.0, -0.5), r=(4.2, 2.8))
WET = dict(c=(-4.3, 2.4), r=(3.4, 2.4))
STREAM = [(-6.8, -4.2), (-4.8, -3.4), (-2.6, -2.9), (-0.6, -2.1)]
OUTFLOW = [(3.3, 2.1), (3.8, 3.8), (4.0, 5.6)]
SPRING = (-6.8, -4.2)
SAND = (6.2, 0.6)
BASE = 0.15                 # じめんの たかさ
WATER_POND = 0.0            # いけ・せせらぎの みずめん
WATER_WET = 0.06            # しっちの みずめん
WHEEL = dict(c=(-4.2, -3.25), r=0.78)


def ell(x, z, e):
    return np.sqrt(((np.asarray(x) - e['c'][0]) / e['r'][0]) ** 2 + ((np.asarray(z) - e['c'][1]) / e['r'][1]) ** 2)


def seg_dist(x, z, pts):
    x = np.asarray(x, dtype=float)
    z = np.asarray(z, dtype=float)
    best = np.full(np.broadcast(x, z).shape, 1e9)
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        dx, dz = bx - ax, bz - az
        t = np.clip(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1)
        d = np.hypot(x - (ax + t * dx), z - (az + t * dz))
        best = np.minimum(best, d)
    return best


def ground(x, z):
    """くさの じめん（ふたも おなじ）"""
    return BASE + 0.05 * (noise2(x, z, 1.6, 1) - 0.5) + 0.03 * (noise2(x, z, 0.45, 2) - 0.5)


def hfun(x, z):
    """じめんの たかさ"""
    x = np.asarray(x, dtype=float)
    z = np.asarray(z, dtype=float)
    h = ground(x, z)
    # ふちは すこし もりあがる
    edge = np.maximum(np.abs(x) / 8, np.abs(z) / 5.5)
    h = h + 0.25 * smoothstep(0.9, 1.0, edge)
    # いけ（まんなかが ふかい）
    d = ell(x, z, POND) * (1 + 0.06 * (noise2(x, z, 0.9, 3) - 0.5))
    hp = BASE - 0.85 * smoothstep(1.15, 0.2, d)
    # しっち（あさい くぼみに でこぼこ → みずたまり）
    dw = ell(x, z, WET) * (1 + 0.12 * (noise2(x, z, 0.8, 4) - 0.5))
    hw = BASE - 0.15 * smoothstep(1.1, 0.45, dw) + 0.12 * (noise2(x, z, 0.55, 5) - 0.5) * smoothstep(1.1, 0.6, dw)
    # せせらぎ・わき水の いけ
    ds = seg_dist(x, z, STREAM)
    hs = BASE - 0.38 * smoothstep(0.78, 0.18, ds)
    sp = np.hypot(x - SPRING[0], z - SPRING[1])
    hs = np.minimum(hs, BASE - 0.32 * smoothstep(0.75, 0.2, sp))
    # ながれだし
    do = seg_dist(x, z, OUTFLOW)
    ho = BASE - 0.24 * smoothstep(0.55, 0.12, do)
    h = np.minimum.reduce([h, hp, hw, hs, ho])
    # すなはま（いけに むかって なだらか）
    sd = np.hypot(x - SAND[0], z - SAND[1])
    h = h + 0.05 * smoothstep(1.6, 0.2, sd)
    return h


def masks(x, z):
    d = ell(x, z, POND)
    dw = ell(x, z, WET)
    ds = seg_dist(x, z, STREAM)
    sp = np.hypot(x - SPRING[0], z - SPRING[1])
    do = seg_dist(x, z, OUTFLOW)
    return d, dw, ds, sp, do


# ---------- がぞう・ざいしつ ----------

def image(name, col, alpha=None, non_color=False):
    H, W = col.shape[:2]
    a = np.ones((H, W, 1)) if alpha is None else alpha[..., None]
    img = bpy.data.images.new(name, W, H, alpha=True)
    img.pixels.foreach_set(np.concatenate([np.clip(col, 0, 1), a], axis=2).astype(np.float32).ravel())
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    img.pack()
    return img


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, color=(1, 1, 1), img=None, rough=0.8, metal=0.0, alpha_img=False, normal=None, coat=0.0):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.08
    if img:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha_img:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
            if hasattr(m, 'surface_render_method'):
                m.surface_render_method = 'DITHERED'
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = normal
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m


def normal_image(name, h, strength=3.0):
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    n = np.stack([-dx, -dy, np.ones_like(h)], axis=2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return image(name, n * 0.5 + 0.5, non_color=True)


def obj(name, bm, mat, parent=None, smooth=True, loc=None, up=False):
    if up:
        # ひらいた めん（じめん・みずめん・ふた）は うえむきに そろえる
        bm.normal_update()
        for f in bm.faces:
            if f.normal.z < 0:
                f.normal_flip()
    else:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    if isinstance(mat, list):
        for m in mat:
            me.materials.append(m)
    else:
        me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if parent:
        ob.parent = parent
    if loc:
        ob.location = P(*loc)
    return ob


def empty(name, pos=(0, 0, 0), parent=None, rot_y=0.0):
    e = bpy.data.objects.new(name, None)
    e.location = P(*pos)
    e.rotation_euler = (0, 0, math.radians(rot_y))     # アプリの y まわり ＝ Blender の z まわり
    bpy.context.scene.collection.objects.link(e)
    if parent:
        e.parent = parent
    return e


class B:
    """1つの ざいしつの かたちを あつめる（アプリの ざひょうで かく）"""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.mat = self.bm.faces.layers.int.new('mat') if False else None

    def blob(self, c, r, seg=16, deform=None, uvfn=None):
        geom = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(6, int(seg * 0.6)), radius=1)
        for v in geom['verts']:
            ux, uy, uz = v.co.x, v.co.z, -v.co.y
            p = np.array([ux * r[0], uy * r[1], uz * r[2]])
            if deform:
                p = deform(np.array([ux, uy, uz]), p)
            v.co = P(c[0] + p[0], c[1] + p[1], c[2] + p[2])
        faces = {f for v in geom['verts'] for f in v.link_faces}
        for f in faces:
            for lp in f.loops:
                co = lp.vert.co
                x, y, z = co.x - c[0], co.z - c[1], -co.y - c[2]
                lp[self.uv].uv = uvfn(x, y, z) if uvfn else (0.5 + x / (2 * max(r[0], 1e-6)), 0.5 + z / (2 * max(r[2], 1e-6)))
        return geom

    def tube(self, path, radii, ring=10, cap=True, up=(0, 1, 0), flat=1.0, vscale=1.0):
        path = [np.asarray(p, dtype=float) for p in path]
        n = len(path)
        tans = [norm(path[min(i + 1, n - 1)] - path[max(i - 1, 0)]) for i in range(n)]
        upv = np.asarray(up, dtype=float)
        nrm = upv - np.dot(upv, tans[0]) * tans[0]
        if np.linalg.norm(nrm) < 1e-6:
            nrm = np.array([1.0, 0, 0]) - tans[0][0] * tans[0]
        nrm = norm(nrm)
        rings = []
        acc = 0.0
        for i in range(n):
            if i:
                nrm = norm(nrm - np.dot(nrm, tans[i]) * tans[i])
                acc += np.linalg.norm(path[i] - path[i - 1])
            bi = np.cross(tans[i], nrm)
            rings.append(([self.bm.verts.new(P(*(path[i] + (math.cos(a) * bi + math.sin(a) * nrm * flat) * radii[i])))
                           for a in np.linspace(0, 2 * math.pi, ring, endpoint=False)], acc))
        for i in range(n - 1):
            (ra, va), (rb, vb) = rings[i], rings[i + 1]
            for j in range(ring):
                f = self.bm.faces.new((ra[j], ra[(j + 1) % ring], rb[(j + 1) % ring], rb[j]))
                for lp, (uu, vv) in zip(f.loops, [(j / ring, va), ((j + 1) / ring, va), ((j + 1) / ring, vb), (j / ring, vb)]):
                    lp[self.uv].uv = (uu, vv * vscale)
        if cap:
            for k in (0, n - 1):
                c = self.bm.verts.new(P(*path[k]))
                for j in range(ring):
                    try:
                        self.bm.faces.new((rings[k][0][j], rings[k][0][(j + 1) % ring], c))
                    except ValueError:
                        pass

    def box(self, c, size, rot_y=0.0, uvs=1.0):
        """ちょくほうたい（y まわりに rot_y ど）"""
        cx, cy, cz = c
        sx, sy, sz = (s / 2 for s in size)
        ca, sa = math.cos(math.radians(rot_y)), math.sin(math.radians(rot_y))
        def p(x, y, z):
            return P(cx + x * ca + z * sa, cy + y, cz - x * sa + z * ca)
        vs = [self.bm.verts.new(p(x, y, z)) for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)]
        idx = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        for q in idx:
            f = self.bm.faces.new([vs[i] for i in q])
            for lp, uv in zip(f.loops, [(0, 0), (uvs, 0), (uvs, uvs), (0, uvs)]):
                lp[self.uv].uv = uv

    def grid(self, xs, zs, yfun, keep, uvfn):
        """xs × zs の あみめ。keep(x, z) が ぜんぶ True の しかくだけ つくる"""
        X, Z = np.meshgrid(xs, zs)
        Y = yfun(X, Z)
        K = keep(X, Z)
        vid = {}
        def v(i, j):
            if (i, j) not in vid:
                vid[(i, j)] = self.bm.verts.new(P(X[i, j], Y[i, j], Z[i, j]))
            return vid[(i, j)]
        for i in range(len(zs) - 1):
            for j in range(len(xs) - 1):
                if not (K[i, j] and K[i + 1, j] and K[i, j + 1] and K[i + 1, j + 1]):
                    continue
                qs = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                f = self.bm.faces.new([v(a, b) for a, b in qs])
                for lp, (a, b) in zip(f.loops, qs):
                    lp[self.uv].uv = uvfn(X[a, b], Z[a, b])


def export(tex=None):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
    print('EXPORTED', OUT, os.path.getsize(OUT))


# ---------- じめん ----------

def terrain_texture(W=2048, H=1408):
    """うえから みた じめんの いろ（x −8〜8 ／ z −5.5〜5.5）"""
    xs = -8 + 16 * (np.arange(W) + 0.5) / W
    zs = 5.5 - 11 * (np.arange(H) + 0.5) / H          # がぞうの したの ぎょう ＝ てまえ
    X, Z = np.meshgrid(xs, zs)
    h = hfun(X, Z)
    d, dw, ds, sp, do = masks(X, Z)
    n1 = value_noise(W, H, 40, 11)
    n2 = value_noise(W, H, 160, 12)
    n3 = value_noise(W, H, 9, 13)
    # くさ：こい ところ・うすい ところ
    grass = np.array([0.36, 0.55, 0.22]) * (0.75 + 0.4 * n1[..., None]) * (0.9 + 0.2 * n2[..., None])
    grass = grass * (1 - 0.25 * smoothstep(0.55, 0.8, n3)[..., None]) + np.array([0.55, 0.62, 0.3]) * 0.25 * smoothstep(0.55, 0.8, n3)[..., None]
    col = grass.copy()
    grass_only = grass.copy()          # ふた よう（いけ・せせらぎを まだ ひろげて いない とき）
    # しっち：どろと こけ
    wetm = smoothstep(1.15, 0.85, dw)[..., None]
    mud = np.array([0.33, 0.31, 0.2]) * (0.8 + 0.4 * n2[..., None]) * (1 - 0.3 * smoothstep(0.1, -0.02, h)[..., None])
    moss = np.array([0.32, 0.42, 0.18]) * (0.8 + 0.4 * n1[..., None])
    wetcol = mud * (1 - smoothstep(0.1, 0.14, h)[..., None]) + moss * smoothstep(0.1, 0.14, h)[..., None]
    col = col * (1 - wetm) + wetcol * wetm
    # いけの そこ：あさい ところは すな、ふかい ところは みどりがかった どろ
    pm = smoothstep(1.2, 0.98, d)[..., None]
    sandb = np.array([0.6, 0.55, 0.4]) * (0.85 + 0.3 * n2[..., None])
    deep = np.array([0.2, 0.26, 0.18]) * (0.8 + 0.4 * n1[..., None])
    pond = sandb * smoothstep(-0.45, -0.1, h)[..., None] + deep * (1 - smoothstep(-0.45, -0.1, h)[..., None])
    pond = pond * (1 - 0.35 * smoothstep(0.08, 0.13, h)[..., None]) + grass * 0.35 * smoothstep(0.08, 0.13, h)[..., None]
    col = col * (1 - pm) + pond * pm
    # せせらぎ・わき水・ながれだし：じゃり
    sm = np.maximum.reduce([smoothstep(0.8, 0.55, ds), smoothstep(0.75, 0.5, sp), smoothstep(0.55, 0.38, do)])[..., None]
    pebble = (value_noise(W, H, 420, 14) > 0.62).astype(float)[..., None]
    gravel = np.array([0.5, 0.49, 0.44]) * (0.75 + 0.45 * n2[..., None]) * (1 - 0.25 * pebble) + np.array([0.68, 0.66, 0.6]) * 0.25 * pebble
    col = col * (1 - sm) + gravel * sm
    # すなはま
    sd = np.hypot(X - SAND[0], Z - SAND[1])
    sbm = smoothstep(1.7, 1.0, sd)[..., None]
    beach = np.array([0.8, 0.72, 0.52]) * (0.88 + 0.24 * n2[..., None])
    col = col * (1 - sbm) + beach * sbm
    # くさの なかの ちいさな はな
    fl = (rng.random((H, W)) > 0.9985) & (h > 0.12) & (dw > 1.15) & (d > 1.25)
    col[fl] = np.where(rng.random((fl.sum(), 1)) > 0.5, np.array([0.95, 0.92, 0.8]), np.array([0.95, 0.82, 0.3]))
    # でこぼこ
    bump = n2 * 0.6 + value_noise(W, H, 300, 15) * 0.4 + 0.5 * pebble[..., 0] * sm[..., 0]
    return image('terrain', col), normal_image('terrain_n', bump, 2.0), image('grass', grass_only)


def build_terrain():
    col, nrm, grass = terrain_texture()
    mat = material('terrain', img=col, normal=nrm, rough=0.95)
    gmat = material('grass', img=grass, normal=nrm, rough=0.95)
    uvfn = lambda x, z: ((x + 8) / 16, (5.5 - z) / 11)
    xs = np.linspace(-8, 8, 193)
    zs = np.linspace(-5.5, 5.5, 133)
    b = B()
    b.grid(xs, zs, hfun, lambda X, Z: np.ones_like(X, bool), uvfn)
    obj('terrain', b.bm, mat, up=True)
    # ふた：まだ ひろげて いない いけ・せせらぎを くさで かくす（じめんと おなじ いろ）
    b = B()
    sand_up = lambda X, Z: ground(X, Z) + 0.056 * smoothstep(1.6, 0.2, np.hypot(X - SAND[0], Z - SAND[1]))   # すなはまの もりあがりも かくす
    b.grid(xs, zs, sand_up, lambda X, Z: (ell(X, Z, POND) < 1.32) | (seg_dist(X, Z, OUTFLOW) < 0.7) | (np.hypot(X - SAND[0], Z - SAND[1]) < 1.9), uvfn)
    obj('cover_pond', b.bm, gmat, up=True)
    b = B()
    b.grid(xs, zs, ground, lambda X, Z: ((seg_dist(X, Z, STREAM) < 0.95) | (np.hypot(X - SPRING[0], Z - SPRING[1]) < 0.95)) & (ell(X, Z, POND) > 1.02), uvfn)
    obj('cover_stream', b.bm, gmat, up=True)
    # みずめん
    water = material('water', (0.35, 0.6, 0.62), rough=0.05)
    fine = (np.linspace(-8, 8, 97), np.linspace(-5.5, 5.5, 67))
    for name, keep, level in (
        ('water_pond', lambda X, Z: (ell(X, Z, POND) < 1.18) | (seg_dist(X, Z, OUTFLOW) < 0.6), WATER_POND),
        ('water_stream', lambda X, Z: (seg_dist(X, Z, STREAM) < 0.85) | (np.hypot(X - SPRING[0], Z - SPRING[1]) < 0.8), WATER_POND),
        ('water_wet', lambda X, Z: ell(X, Z, WET) < 1.12, WATER_WET),
    ):
        b = B()
        b.grid(*fine, lambda X, Z, lv=level: np.full_like(X, lv), keep, uvfn)
        obj(name, b.bm, water, smooth=False, up=True)


# ---------- もの（props） ----------

def wood_texture(moss=0.0, seed=1, W=256, H=256):
    """き の いろ。moss：みどりの こけ"""
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    grain = np.sin((U * 40 + value_noise(W, H, 8, seed) * 6) * math.pi) * 0.5 + 0.5
    col = np.array([0.42, 0.31, 0.2]) * (0.75 + 0.3 * grain[..., None]) * (0.85 + 0.3 * value_noise(W, H, 30, seed + 1)[..., None])
    if moss:
        m = smoothstep(0.55 - 0.3 * moss, 0.75 - 0.3 * moss, value_noise(W, H, 12, seed + 2))[..., None]
        col = col * (1 - m) + np.array([0.33, 0.45, 0.16]) * (0.8 + 0.4 * value_noise(W, H, 60, seed + 3)[..., None]) * m
    return image(f'wood{seed}', col)


def stone_texture(seed=5, W=256, H=256, moss=0.3):
    n = value_noise(W, H, 20, seed) * 0.6 + value_noise(W, H, 80, seed + 1) * 0.4
    col = np.array([0.52, 0.51, 0.47]) * (0.7 + 0.5 * n[..., None])
    m = smoothstep(0.62 - 0.2 * moss, 0.8 - 0.2 * moss, value_noise(W, H, 10, seed + 2))[..., None]
    col = col * (1 - m) + np.array([0.3, 0.42, 0.16]) * m
    return image(f'stone{seed}', col)


def leaf_texture(W=256, H=256, seed=7, base=(0.3, 0.5, 0.2)):
    n = value_noise(W, H, 24, seed) * 0.45 + value_noise(W, H, 110, seed + 1) * 0.55
    col = np.array(base) * (0.6 + 0.7 * n[..., None])
    # こまかい はっぱの かげ
    dots = (np.random.default_rng(seed).random((H, W)) > 0.82)[..., None]
    col = col * (1 - 0.25 * dots)
    return image(f'leaf{seed}', col)


def rock(b, c, r, seed, flat=0.7):
    rr = np.random.default_rng(seed)
    k = rr.random(6)
    def deform(u, p):
        bump = 1 + 0.18 * math.sin(u[0] * 3 + k[0] * 6) * math.cos(u[2] * 2.5 + k[1] * 6) + 0.08 * math.sin(u[1] * 5 + k[2] * 6)
        p = p * bump
        if u[1] < -0.2:
            p[1] *= 0.5
        return p
    b.blob(c, (r * (0.9 + 0.3 * k[3]), r * flat, r * (0.8 + 0.3 * k[4])), seg=14, deform=deform)


def build_props():
    hy = lambda x, z: float(hfun(np.array([x]), np.array([z]))[0])
    wood = material('wood', img=wood_texture(0.9, 1), rough=0.85)
    wood_dry = material('wood_dry', img=wood_texture(0.0, 2), rough=0.8)
    stone = material('stone', img=stone_texture(5), rough=0.9)
    bark = material('bark', img=wood_texture(0.25, 3), rough=0.95)

    # ---- すいしゃ（こけの はえた き、ながれに すこし つかる） ----
    cx, cz = WHEEL['c']
    R = WHEEL['r']
    flow = -math.degrees(math.atan2(-2.9 + 3.4, -2.6 + 4.8))   # ながれの むき（y まわり。わの めんが ながれに そう）
    cy = WATER_POND + R - 0.22
    root = empty('world_wheel', (cx, 0, cz), rot_y=flow)
    pivot = empty('wheel_pivot', (0, cy, 0), root)          # アプリ：ローカル z まわりに まわす（じく ＝ z）
    w = B()
    width = 0.34
    for side in (-1, 1):
        ring = [(R * math.cos(a), R * math.sin(a), side * width / 2) for a in np.linspace(0, 2 * math.pi, 41)]
        w.tube(ring, [0.035] * 41, ring=6, cap=False, up=(0, 0, 1))
        ring2 = [(R * 0.82 * math.cos(a), R * 0.82 * math.sin(a), side * width / 2) for a in np.linspace(0, 2 * math.pi, 41)]
        w.tube(ring2, [0.025] * 41, ring=6, cap=False, up=(0, 0, 1))
        for k in range(8):
            a = 2 * math.pi * k / 8
            w.tube([(0.06 * math.cos(a), 0.06 * math.sin(a), side * width / 2), (R * math.cos(a), R * math.sin(a), side * width / 2)], [0.028, 0.022], ring=6)
    w2 = B()
    for k in range(16):
        a = 2 * math.pi * k / 16
        ca, sa = math.cos(a), math.sin(a)
        r0, r1 = R * 0.8, R * 1.04
        th = 0.022
        pts = []
        for (r, t) in ((r0, -th), (r1, -th), (r1, th), (r0, th)):
            tx, ty = -sa, ca
            pts.append((r * ca + t * tx, r * sa + t * ty))
        vs = [w2.bm.verts.new(P(px, py, s * (width / 2 + 0.01))) for s in (-1, 1) for (px, py) in pts]
        for q in [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
            f = w2.bm.faces.new([vs[i] for i in q])
            for lp, uv in zip(f.loops, [(0, 0), (1, 0), (1, 0.3), (0, 0.3)]):
                lp[w2.uv].uv = uv
    w.tube([(0, 0, -0.32), (0, 0, 0.32)], [0.07, 0.07], ring=10)       # ハブ
    w.tube([(0, 0, -0.75), (0, 0, 0.75)], [0.045, 0.045], ring=8)      # じく
    obj('wheel', w.bm, wood, pivot)
    obj('wheel_blades', w2.bm, wood, pivot)
    # ささえ の はしら・はり（まわらない）
    f = B()
    for s in (-1, 1):
        zz = s * 0.62
        for xo in (-0.35, 0.35):
            f.tube([(xo, -0.35, zz), (0, cy + 0.02, zz)], [0.06, 0.05], ring=8)
        f.box((0, cy + 0.05, zz), (0.22, 0.12, 0.16))
        f.box((0, -0.05, zz), (1.0, 0.1, 0.14))
    obj('wheel_frame', f.bm, wood, root)

    # ---- いわの す（せせらぎが いけに はいる ところ） ----
    dx, dz = -0.55, -1.75
    by = hy(dx, dz)
    st = B()
    rock(st, (dx - 0.38, by + 0.05, dz), 0.32, 1, 0.8)
    rock(st, (dx + 0.38, by + 0.05, dz + 0.05), 0.3, 2, 0.8)
    rock(st, (dx, by + 0.42, dz - 0.05), 0.5, 3, 0.35)      # やね の いわ（あなが あく）
    rock(st, (dx - 0.7, by + 0.1, dz - 0.35), 0.28, 4)
    rock(st, (dx + 0.75, by + 0.08, dz - 0.3), 0.26, 5)
    rock(st, (dx + 0.2, by + 0.0, dz - 0.5), 0.3, 6)
    obj('world_den', st.bm, stone)
    # わき水の まわりの いし
    st = B()
    for k in range(9):
        a = 2 * math.pi * k / 9 + 0.3
        x, z = SPRING[0] + 0.8 * math.cos(a), SPRING[1] + 0.7 * math.sin(a)
        rock(st, (x, hy(x, z) + 0.02, z), 0.16 + 0.08 * ((k * 7) % 3) / 2, 20 + k)
    obj('world_spring', st.bm, stone)
    # せせらぎの へりの いし
    st = B()
    for k, (x, z) in enumerate([(-5.6, -3.0), (-3.4, -3.65), (-2.0, -2.55), (-1.4, -3.0), (-5.3, -4.1), (-3.0, -2.45)]):
        rock(st, (x, hy(x, z) + 0.03, z), 0.18 + 0.05 * (k % 3), 40 + k)
    obj('world_streamrocks', st.bm, stone)

    # ---- ひなたぼっこの まるた（いけ） ----
    lg = B()
    a = math.radians(-20)
    c = np.array([2.7, WATER_POND + 0.05, -0.2])
    d = np.array([math.cos(a), 0, -math.sin(a)])
    lg.tube([c - d * 0.9, c + d * 0.9], [0.17, 0.16], ring=14, up=(0, 1, 0), vscale=0.6)
    lg.tube([c + d * 0.2, c + d * 0.2 + np.array([0.1, 0.25, -0.25])], [0.05, 0.02], ring=6)
    obj('world_log', lg.bm, bark)

    # ---- もくどう（てまえ → いけ） ----
    path = np.array([(-2.6, 5.5), (-2.1, 3.7), (-1.15, 2.3), (-0.25, 1.55)])
    pts = []
    for i in range(len(path) - 1):
        for t in np.linspace(0, 1, 12, endpoint=False):
            pts.append(path[i] * (1 - t) + path[i + 1] * t)
    pts.append(path[-1])
    pts = np.array(pts)
    bw = B()
    posts = B()
    for i in range(len(pts) - 1):
        p0, p1 = pts[i], pts[i + 1]
        seg = np.linalg.norm(p1 - p0)
        n = max(1, int(seg / 0.14))
        ang = math.degrees(math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]))
        for k in range(n):
            q = p0 + (p1 - p0) * (k + 0.5) / n
            bw.box((q[0], 0.3, q[1]), (0.11, 0.035, 0.6), rot_y=ang)
    for i in range(0, len(pts), 3):
        p = pts[i]
        j = min(i + 1, len(pts) - 1)
        dv = pts[j] - pts[max(j - 1, 0)]
        nv = norm([-dv[1], dv[0]])
        for s in (-1, 1):
            q = p + nv * 0.27 * s
            posts.tube([(q[0], hy(q[0], q[1]) - 0.15, q[1]), (q[0], 0.28, q[1])], [0.035, 0.035], ring=6)
    obj('world_boardwalk', bw.bm, wood_dry)
    obj('world_boardwalk_posts', posts.bm, wood)

    # ---- ならべる もの（アプリが おく） ----
    leaf = material('leaf', img=leaf_texture(seed=7), rough=0.8)
    leaf2 = material('leaf2', img=leaf_texture(seed=8, base=(0.36, 0.52, 0.2)), rough=0.8)
    for t in range(2):
        tr = B()
        rr = np.random.default_rng(100 + t)
        H = 2.4 + 0.6 * t
        tr.tube([(0, -0.2, 0), (0.05, H * 0.45, 0.02), (-0.04, H * 0.75, 0)], [0.2, 0.15, 0.1], ring=12, vscale=0.5)
        for k in range(4):
            a = 2 * math.pi * k / 4 + rr.random()
            tr.tube([(0, H * (0.5 + 0.08 * k), 0), (0.9 * math.cos(a), H * (0.72 + 0.06 * k), 0.9 * math.sin(a))], [0.07, 0.03], ring=8)
        obj(f'tree{t}_trunk', tr.bm, bark)
        cn = B()
        for k in range(10):
            a = rr.random() * 2 * math.pi
            rad = 0.4 + rr.random() * 0.8
            c = (rad * math.cos(a), H * (0.85 + 0.3 * rr.random()), rad * math.sin(a))
            s = 0.55 + rr.random() * 0.45
            kk = rr.random(3)
            def deform(u, p, kk=kk):
                return p * (1 + 0.15 * math.sin(u[0] * 5 + kk[0] * 6) * math.sin(u[2] * 4 + kk[1] * 6) + 0.1 * math.sin(u[1] * 7 + kk[2] * 6))
            cn.blob(c, (s, s * 0.75, s), seg=22, deform=deform)
        obj(f'tree{t}_leaves', cn.bm, leaf if t == 0 else leaf2)
    # あし（ヨシ）の むれ
    reedm = material('reed', (0.45, 0.58, 0.25), rough=0.8)
    rd = B()
    rr = np.random.default_rng(5)
    for k in range(26):
        x, z = rr.normal(0, 0.18), rr.normal(0, 0.18)
        h = 0.7 + rr.random() * 0.6
        bx, bz = rr.normal(0, 0.12), rr.normal(0, 0.12)
        rd.tube([(x, -0.05, z), (x + bx * 0.4, h * 0.6, z + bz * 0.4), (x + bx, h, z + bz)], [0.014, 0.01, 0.003], ring=4, cap=False)
    obj('reed', rd.bm, reedm)
    # はなしょうぶ（きいろい アヤメ）
    ir = B()
    fl = B()
    for k in range(9):
        a = rr.random() * 2 * math.pi
        x, z = 0.1 * math.cos(a), 0.1 * math.sin(a)
        h = 0.5 + rr.random() * 0.25
        tip = (x + 0.15 * math.cos(a), h, z + 0.15 * math.sin(a))
        ir.tube([(x, -0.05, z), (x * 1.5, h * 0.55, z * 1.5), tip], [0.025, 0.02, 0.003], ring=4, cap=False, flat=0.25)
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.4
        c = (0.08 * math.cos(a), 0.62 + 0.08 * (k % 2), 0.08 * math.sin(a))
        for j in range(3):
            pa = a + 2 * math.pi * j / 3
            fl.blob((c[0] + 0.05 * math.cos(pa), c[1] - 0.02, c[2] + 0.05 * math.sin(pa)), (0.05, 0.012, 0.03), seg=8)
        fl.blob(c, (0.02, 0.04, 0.02), seg=8)
    obj('iris', ir.bm, reedm)
    obj('iris_flowers', fl.bm, material('iris_flower', (0.98, 0.82, 0.18), rough=0.6))
    # スイレンの は と はな
    lp = B()
    seg = 24
    cvert = lp.bm.verts.new(P(0, 0, 0))
    ring = []
    for k in range(seg + 1):
        a = math.radians(15) + (2 * math.pi - math.radians(30)) * k / seg
        ring.append(lp.bm.verts.new(P(0.28 * math.cos(a), 0.0, 0.28 * math.sin(a))))
    for k in range(seg):
        f = lp.bm.faces.new((cvert, ring[k], ring[k + 1]))
        for l in f.loops:
            co = l.vert.co
            l[lp.uv].uv = (0.5 + co.x, 0.5 - co.y)
    obj('lily', lp.bm, material('lily', img=leaf_texture(seed=9, base=(0.28, 0.48, 0.18)), rough=0.5))
    lf = B()
    for j in range(8):
        a = 2 * math.pi * j / 8
        lf.blob((0.06 * math.cos(a), 0.05, 0.06 * math.sin(a)), (0.05, 0.025, 0.02), seg=8,
                deform=lambda u, p, a=a: np.array([p[0] * math.cos(a) - p[2] * math.sin(a), p[1], p[0] * math.sin(a) + p[2] * math.cos(a)]))
    lf.blob((0, 0.06, 0), (0.025, 0.02, 0.025), seg=8)
    obj('lily_flower', lf.bm, material('lily_flower', (0.98, 0.72, 0.82), rough=0.5))
    # ころがる いし
    for k in range(2):
        st = B()
        rock(st, (0, 0.05, 0), 0.25, 60 + k)
        obj(f'rock{k}', st.bm, stone)
    # まだ ひろげて いない ところの かんばん
    sg = B()
    sg.box((0, 0.45, 0), (0.07, 0.9, 0.07))
    sg.box((0, 0.8, 0.04), (0.6, 0.32, 0.04))
    obj('sign', sg.bm, wood_dry)


# ---------- いきもの ----------

def frog_texture(W=256, H=256):
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    col = np.array([0.4, 0.72, 0.25]) * (0.85 + 0.3 * value_noise(W, H, 20, 31)[..., None])
    edge = np.abs(U - 0.5) * 2
    col = col * (1 - 0.25 * smoothstep(0.7, 1, edge))[..., None]
    return image('frog', col)


def turtle_texture(W=512, H=512):
    """こうらの こうばん（6かく の もよう）と ふち"""
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    x, y = (U - 0.5) * 2, (Vv - 0.5) * 2
    # こうばんの さかい：たて 3れつ ＋ まわり
    lines = np.zeros_like(U)
    for c in (-0.33, 0.33):
        lines = np.maximum(lines, smoothstep(0.03, 0.0, np.abs(x - c)) * (np.abs(y) < 0.75))
    for c in (-0.45, 0.0, 0.45):
        lines = np.maximum(lines, smoothstep(0.03, 0.0, np.abs(y - c)) * (np.abs(x) < 0.9))
    rim = smoothstep(0.82, 0.86, np.hypot(x, y * 0.95))
    lines = np.maximum(lines, rim * 0.8)
    base = np.array([0.33, 0.29, 0.17]) * (0.8 + 0.4 * value_noise(W, H, 30, 32)[..., None])
    col = base * (1 - 0.6 * lines[..., None])
    # ゼニガメの きいろい すじ（3ぼん）
    keel = sum(smoothstep(0.025, 0.0, np.abs(x - c)) for c in (-0.3, 0.0, 0.3)) * (np.abs(y) < 0.7)
    col = col * (1 - 0.6 * keel[..., None]) + np.array([0.75, 0.66, 0.3]) * 0.6 * keel[..., None]
    return image('turtle_shell', col)


def sansho_texture(W=512, H=256, larva=False):
    n = value_noise(W, H, 16, 33) * 0.6 + value_noise(W, H, 60, 34) * 0.4
    col = np.array([0.42, 0.35, 0.24]) * (0.75 + 0.5 * n[..., None])
    if not larva:
        spots = smoothstep(0.6, 0.7, value_noise(W, H, 28, 35))[..., None]
        col = col * (1 - 0.55 * spots)
    return image('sansho_larva' if larva else 'sansho', col)


def build_animals():
    frog = material('frog', img=frog_texture(), rough=0.35, coat=0.6)
    belly = material('frog_belly', (0.92, 0.94, 0.85), rough=0.6)
    eye = material('eye', (0.05, 0.04, 0.03), rough=0.1, coat=1.0)
    jelly = material('jelly', (0.85, 0.93, 0.88), rough=0.1)
    tadc = material('tadpole', (0.24, 0.22, 0.17), rough=0.4)
    shell = material('turtle_shell', img=turtle_texture(), rough=0.45, coat=0.4)
    skin = material('turtle_skin', (0.36, 0.4, 0.22), rough=0.6)
    stripe = material('turtle_stripe', (0.82, 0.76, 0.3), rough=0.6)
    eggw = material('egg', (0.97, 0.95, 0.88), rough=0.5)
    sal = material('sansho', img=sansho_texture(), rough=0.55)
    salL = material('sansho_larva', img=sansho_texture(larva=True), rough=0.5)
    gill = material('gill', (0.82, 0.48, 0.38), rough=0.5)

    # ---- カエル ----
    root = empty('kaeru_egg')
    b = B()
    b.blob((0, 0.05, 0), (0.22, 0.07, 0.17), seg=16)
    obj('kaeru_egg_jelly', b.bm, jelly, root)
    b = B()
    for k in range(18):
        a = k * 2.4
        r = 0.15 * math.sqrt((k + 0.5) / 18)
        b.blob((r * math.cos(a), 0.06, r * math.sin(a)), (0.022, 0.022, 0.022), seg=8)
    obj('kaeru_egg_dots', b.bm, eye, root)
    for key, legs in (('tadpole', False), ('legs', True)):
        root = empty(f'kaeru_{key}')
        b = B()
        b.blob((0, 0.04, 0.04), (0.06, 0.045, 0.075), seg=14)
        if legs:
            for s in (-1, 1):
                b.tube([(s * 0.04, 0.02, -0.02), (s * 0.08, 0.0, -0.06), (s * 0.06, 0.0, -0.1)], [0.012, 0.01, 0.008], ring=6)
        obj(f'kaeru_{key}_body', b.bm, tadc, root)
        tail = empty('tail', (0, 0.04, -0.03), root)
        t = B()
        t.tube([(0, 0, 0), (0, 0, -0.08), (0, 0, -0.17)], [0.018, 0.012, 0.002], ring=6, flat=3.0)
        obj(f'kaeru_{key}_tail', t.bm, tadc, tail)
        e = B()
        for s in (-1, 1):
            e.blob((s * 0.035, 0.06, 0.08), (0.012, 0.012, 0.012), seg=8)
        obj(f'kaeru_{key}_eyes', e.bm, material('tad_eye', (0.8, 0.75, 0.55), rough=0.3), root)
    # カエル（こガエルは アプリで ちいさく）
    root = empty('kaeru_adult')
    b = B()
    b.blob((0, 0.07, 0), (0.09, 0.06, 0.11), seg=18, deform=lambda u, p: p * np.array([1 + 0.15 * max(0, -u[2]), 1, 1]))
    b.blob((0, 0.08, 0.09), (0.075, 0.05, 0.06), seg=14)
    for s in (-1, 1):
        b.blob((s * 0.05, 0.12, 0.1), (0.028, 0.028, 0.028), seg=10)
        # うしろあし（たたむ）
        b.tube([(s * 0.07, 0.05, -0.05), (s * 0.12, 0.04, 0.02), (s * 0.09, 0.015, -0.08), (s * 0.13, 0.008, -0.13)], [0.03, 0.025, 0.015, 0.01], ring=8)
        b.tube([(s * 0.06, 0.04, 0.08), (s * 0.09, 0.015, 0.12), (s * 0.1, 0.008, 0.15)], [0.016, 0.012, 0.008], ring=6)
    obj('kaeru_adult_body', b.bm, frog, root)
    b = B()
    b.blob((0, 0.035, 0.03), (0.08, 0.025, 0.1), seg=12)
    obj('kaeru_adult_belly', b.bm, belly, root)
    e = B()
    for s in (-1, 1):
        e.blob((s * 0.058, 0.128, 0.115), (0.018, 0.018, 0.016), seg=10)
    obj('kaeru_adult_eyes', e.bm, eye, root)

    # ---- カメ（ゼニガメ・こども・おとなは アプリで おおきさを かえる） ----
    root = empty('kame_egg')
    b = B()
    for (x, z, a) in ((-0.05, 0, 0), (0.05, 0.02, 0.3), (0, -0.06, 0.6), (0.02, 0.07, 0.9)):
        b.blob((x, 0.04, z), (0.032, 0.03, 0.042), seg=12)
    obj('kame_egg_eggs', b.bm, eggw, root)
    root = empty('kame')
    b = B()
    def dome(u, p):
        if u[1] < 0:
            p[1] *= 0.25
        return p
    b.blob((0, 0.1, 0), (0.17, 0.09, 0.22), seg=24, deform=dome, uvfn=lambda x, y, z: (0.5 + x / 0.36, 0.5 + z / 0.46))
    obj('kame_shell', b.bm, shell, root)
    b = B()
    b.blob((0, 0.11, 0.27), (0.05, 0.045, 0.065), seg=12)
    b.tube([(0, 0.09, 0.15), (0, 0.105, 0.23)], [0.04, 0.042], ring=10)
    for s in (-1, 1):
        for zz in (0.13, -0.13):
            b.tube([(s * 0.12, 0.06, zz), (s * 0.2, 0.025, zz + 0.04 * (1 if zz > 0 else -1)), (s * 0.22, 0.01, zz + 0.06 * (1 if zz > 0 else -1))], [0.035, 0.03, 0.018], ring=8)
    b.tube([(0, 0.07, -0.2), (0, 0.06, -0.27), (0, 0.05, -0.3)], [0.025, 0.015, 0.004], ring=6)
    obj('kame_skin', b.bm, skin, root)
    b = B()
    for s in (-1, 1):
        b.tube([(s * 0.032, 0.115, 0.2), (s * 0.04, 0.12, 0.3)], [0.008, 0.006], ring=6)
    obj('kame_stripes', b.bm, stripe, root)
    e = B()
    for s in (-1, 1):
        e.blob((s * 0.035, 0.125, 0.3), (0.011, 0.011, 0.011), seg=8)
    obj('kame_eyes', e.bm, eye, root)

    # ---- オオサンショウウオ ----
    root = empty('sansho_egg')
    b = B()
    pts = [(0.25 * math.cos(a) * (1 + 0.2 * math.sin(a * 3)), 0.04, 0.18 * math.sin(a)) for a in np.linspace(0, 2 * math.pi * 1.3, 20)]
    b.tube(pts, [0.008] * 20, ring=5, cap=False)
    for p in pts[::1]:
        b.blob(p, (0.03, 0.03, 0.03), seg=8)
    obj('sansho_egg_string', b.bm, jelly, root)
    y = B()
    for p in pts:
        y.blob(p, (0.012, 0.012, 0.012), seg=6)
    obj('sansho_egg_yolk', y.bm, material('yolk', (0.92, 0.75, 0.3), rough=0.4), root)
    for key, larva in (('larva', True), ('adult', False)):
        root = empty(f'sansho_{key}')
        b = B()
        L = 0.55
        def flat(u, p):
            p[1] *= 1 - 0.25 * max(0, u[1])
            return p
        b.blob((0, 0.06, 0.08), (0.11, 0.05, 0.22), seg=20, deform=flat, uvfn=lambda x, y, z: (0.5 + x / 0.3, 0.5 + z / 0.6))
        b.blob((0, 0.055, 0.3), (0.12, 0.045, 0.1), seg=18, deform=flat, uvfn=lambda x, y, z: (0.5 + x / 0.3, 0.8 + z / 0.6))
        for s in (-1, 1):
            for zz in (0.2, -0.05):
                b.tube([(s * 0.09, 0.04, zz), (s * 0.16, 0.015, zz + 0.03), (s * 0.18, 0.006, zz + 0.05)], [0.03, 0.022, 0.012], ring=8)
            # からだの よこの ひだ
            if not larva:
                b.tube([(s * 0.1, 0.045, 0.2), (s * 0.115, 0.04, 0.05), (s * 0.1, 0.04, -0.1)], [0.012, 0.014, 0.008], ring=6)
        obj(f'sansho_{key}_body', b.bm, salL if larva else sal, root)
        tail = empty('tail', (0, 0.055, -0.12), root)
        t = B()
        t.tube([(0, 0, 0), (0, 0, -0.15), (0, 0, -0.3)], [0.06, 0.045, 0.004], ring=8, flat=1.8)
        obj(f'sansho_{key}_tail', t.bm, salL if larva else sal, tail)
        e = B()
        for s in (-1, 1):
            e.blob((s * 0.07, 0.085, 0.34), (0.01, 0.01, 0.01), seg=6)
        obj(f'sansho_{key}_eyes', e.bm, eye, root)
        if larva:
            g = B()
            for s in (-1, 1):
                for k in range(3):
                    base = (s * 0.1, 0.07, 0.24 - k * 0.025)
                    g.tube([base, (base[0] + s * 0.06, base[1] + 0.03, base[2] - 0.02), (base[0] + s * 0.09, base[1] + 0.02, base[2] - 0.05)], [0.012, 0.009, 0.004], ring=6)
            obj('sansho_larva_gills', g.bm, gill, root)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    {'terrain': build_terrain, 'props': build_props, 'animals': build_animals}[KIND]()
    export()


main()
