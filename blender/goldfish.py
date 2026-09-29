# きんぎょの なかまの 3D モデルを Blender で つくって models/*.glb に かきだす。
#   つかいかた（math-app フォルダで）:
#     "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python blender/goldfish.py -- wakin 1
#     しゅるい：wakin（わきん）・ryukin（りゅうきん）・pinpon（ピンポンパール）・demekin（でめきん）・tancho（たんちょう らんちゅう）
#     さいごの かずは もようの ちがい（さらさ もようが 1ぴきずつ ちがう ように いくつか つくる）
#   ふつうは node blender/build.mjs で ぜんぶ つくる
#
# アプリ（three.js）での きまり（medaka.py と おなじ）：
#   ・ながさ 1。はなさき z=+0.5、おびれの さき z=-0.5 ふきん、せなかが +y
#   ・メッシュの なまえ：body・fins（くねらせる）、それいがい（iris・pupil・wen・stalk）は うごかさない
#   ・fins の uv.y は ひれの ねもと 0 → さき 1

import math
import os
import sys

import bmesh
import bpy
import numpy as np

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['wakin', '1']
KIND = ARGS[0]
PATTERN = int(ARGS[1]) if len(ARGS) > 1 else 1
HERE = os.path.dirname(os.path.abspath(__file__))
NAME = f'{KIND}_{PATTERN}'
OUT = os.path.join(HERE, '..', 'models', f'{NAME}.raw.glb')
rng = np.random.default_rng(sum(map(ord, KIND)) * 131 + PATTERN * 7919)


def P(x, y, z):
    """アプリの ざひょう（x よこ・y うえ・z まえ）→ Blender の ざひょう"""
    return (x, -z, y)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------- しゅるいごとの かたち ----------
# s：0 おびれの ねもと → 1 はなさき。top・bot：せなか・おなかの たかさ、wid：はんぶんの はば
S_PTS = [0.0, 0.1, 0.25, 0.42, 0.56, 0.7, 0.8, 0.88, 0.94, 0.98, 1.0]
SPECS = {
    'wakin': dict(
        zT=-0.26, round=0.85,
        top=[0.03, 0.04, 0.07, 0.1, 0.11, 0.108, 0.096, 0.08, 0.058, 0.034, 0.014],
        bot=[-0.03, -0.042, -0.075, -0.1, -0.108, -0.103, -0.09, -0.072, -0.052, -0.03, -0.012],
        wid=[0.013, 0.018, 0.035, 0.05, 0.056, 0.057, 0.054, 0.048, 0.038, 0.022, 0.005],
        eye=dict(s=0.875, a=1.2, r=0.03), scales=(26, 11),
        dorsal=dict(t=(0.36, 0.68), h=0.12, sweep=0.35), anal=dict(t=(0.17, 0.3), h=0.07),
        tail=dict(len=0.24, span=0.12, kind='fork', fork=0.55, round=0.1), pect=0.09, pelvic=0.07,
    ),
    'ryukin': dict(
        zT=-0.08, round=0.95,
        top=[0.03, 0.05, 0.1, 0.16, 0.186, 0.18, 0.158, 0.125, 0.085, 0.045, 0.016],
        bot=[-0.03, -0.05, -0.1, -0.14, -0.152, -0.146, -0.128, -0.1, -0.068, -0.035, -0.012],
        wid=[0.013, 0.022, 0.046, 0.068, 0.078, 0.077, 0.07, 0.058, 0.042, 0.022, 0.004],
        eye=dict(s=0.87, a=1.3, r=0.033), scales=(20, 10),
        dorsal=dict(t=(0.3, 0.7), h=0.22, sweep=0.45), anal=dict(t=(0.12, 0.26), h=0.12, double=0.05),
        tail=dict(len=0.44, span=0.2, kind='fork', fork=0.4, droop=0.1, split=0.1, round=0.35), pect=0.11, pelvic=0.1,
    ),
    'pinpon': dict(
        zT=-0.16, round=1.0,
        top=[0.03, 0.08, 0.18, 0.25, 0.27, 0.265, 0.235, 0.19, 0.125, 0.06, 0.018],
        bot=[-0.03, -0.08, -0.19, -0.26, -0.28, -0.27, -0.24, -0.19, -0.125, -0.058, -0.014],
        wid=[0.015, 0.05, 0.13, 0.18, 0.2, 0.198, 0.18, 0.145, 0.095, 0.042, 0.006],
        eye=dict(s=0.885, a=1.3, r=0.032), scales=(18, 10), pearl=True,
        dorsal=dict(t=(0.34, 0.62), h=0.1, sweep=0.4), anal=dict(t=(0.14, 0.26), h=0.07, double=0.05),
        tail=dict(len=0.25, span=0.13, kind='fork', fork=0.3, split=0.09, droop=0.03, round=0.35), pect=0.08, pelvic=0.07,
    ),
    'demekin': dict(
        zT=-0.1, round=0.95,
        top=[0.03, 0.05, 0.1, 0.15, 0.172, 0.166, 0.146, 0.118, 0.082, 0.045, 0.016],
        bot=[-0.03, -0.05, -0.1, -0.138, -0.15, -0.144, -0.126, -0.098, -0.066, -0.034, -0.012],
        wid=[0.013, 0.022, 0.046, 0.066, 0.074, 0.073, 0.066, 0.055, 0.04, 0.022, 0.004],
        eye=dict(s=0.87, a=1.45, r=0.056, telescope=0.05), scales=(20, 10),
        dorsal=dict(t=(0.3, 0.68), h=0.21, sweep=0.5), anal=dict(t=(0.12, 0.26), h=0.12, double=0.05),
        tail=dict(len=0.42, span=0.19, kind='fork', fork=0.35, droop=0.14, split=0.09, round=0.35), pect=0.11, pelvic=0.1,
    ),
    'tancho': dict(
        zT=-0.2, round=1.0,
        top=[0.03, 0.05, 0.1, 0.14, 0.156, 0.158, 0.15, 0.136, 0.112, 0.07, 0.036],
        bot=[-0.03, -0.05, -0.1, -0.13, -0.142, -0.138, -0.124, -0.104, -0.078, -0.048, -0.024],
        wid=[0.016, 0.03, 0.07, 0.098, 0.11, 0.112, 0.108, 0.098, 0.078, 0.048, 0.02],
        eye=dict(s=0.9, a=1.55, r=0.028), scales=(20, 10), wen=True,
        dorsal=None, anal=dict(t=(0.12, 0.24), h=0.08, double=0.05),
        tail=dict(len=0.22, span=0.12, kind='fork', fork=0.25, split=0.2, lift=0.04, round=0.4), pect=0.09, pelvic=0.08,
    ),
}
SP = SPECS[KIND]
ZT = SP['zT']


def _hermite(pts, s):
    if s <= 0:
        return pts[0]
    if s >= 1:
        return pts[-1]
    i = max(0, min(len(S_PTS) - 2, int(np.searchsorted(S_PTS, s) - 1)))
    x0, x1 = S_PTS[i], S_PTS[i + 1]
    t = (s - x0) / (x1 - x0)
    def slope(k):
        a = max(0, k - 1)
        b = min(len(S_PTS) - 1, k + 1)
        return (pts[b] - pts[a]) / (S_PTS[b] - S_PTS[a])
    m0 = slope(i) * (x1 - x0)
    m1 = slope(i + 1) * (x1 - x0)
    return (2 * t ** 3 - 3 * t ** 2 + 1) * pts[i] + (t ** 3 - 2 * t ** 2 + t) * m0 + (-2 * t ** 3 + 3 * t ** 2) * pts[i + 1] + (t ** 3 - t ** 2) * m1


def top(s): return _hermite(SP['top'], s)
def bot(s): return _hermite(SP['bot'], s)
def wid(s): return _hermite(SP['wid'], s) * (1 + 0.05 * math.exp(-((s - 0.8) / 0.03) ** 2))
def Z(s): return ZT + s * (0.5 - ZT)
def mid(s): return (top(s) + bot(s)) / 2


def section(s, a):
    """わぎりの てん。a：0 せなか → π おなか"""
    c = math.cos(a)
    sn = math.sin(a)
    e = SP['round']
    half = (top(s) - bot(s)) / 2
    y = mid(s) + half * math.copysign(abs(c) ** e, c)
    x = wid(s) * math.copysign(abs(sn) ** e, sn)
    return x, y, Z(s)


def outward(s, a):
    x, y, _ = section(s, a)
    n = np.array([x / max(wid(s), 1e-4), (y - mid(s)) / max((top(s) - bot(s)) / 2, 1e-4), 0.0])
    return n / (np.linalg.norm(n) + 1e-9)


# ---------- もよう ----------

PALETTE = {
    'wakin': dict(red=[0.93, 0.33, 0.07], red2=[0.98, 0.52, 0.16], white=[0.97, 0.95, 0.92], white_amount=0.45),
    'ryukin': dict(red=[0.9, 0.24, 0.06], red2=[0.98, 0.45, 0.14], white=[0.97, 0.95, 0.93], white_amount=0.35),
    'pinpon': dict(red=[0.95, 0.42, 0.08], red2=[1.0, 0.62, 0.2], white=[0.98, 0.95, 0.9], white_amount=0.4),
    'demekin': dict(red=[0.07, 0.06, 0.09], red2=[0.13, 0.11, 0.16], white=[0.12, 0.1, 0.14], white_amount=0.0),
    'tancho': dict(red=[0.96, 0.95, 0.93], red2=[0.99, 0.98, 0.96], white=[0.96, 0.95, 0.93], white_amount=0.0),
}


def blobs(S, Vv, n, rad):
    """ランダムな まるい もよう（0〜1）"""
    m = np.zeros_like(S)
    for _ in range(n):
        cs, cv, r = rng.random(), rng.random(), rad[0] + rng.random() * (rad[1] - rad[0])
        dv = np.minimum(np.abs(Vv - cv), 1 - np.abs(Vv - cv))
        m = np.maximum(m, np.exp(-(((S - cs) / r) ** 2 + (dv / (r * 0.7)) ** 2)))
    return m


def scale_field(S, Vv, ns, nv):
    """うろこ：まんなかが もりあがり、うしろの ふちに かげ"""
    row = np.floor(Vv * nv * 2)
    fx = (S * ns + 0.5 * (row % 2)) % 1
    fy = (Vv * nv * 2) % 1
    dist = np.hypot((fx - 0.6) * 1.0, (fy - 0.5) * 0.9)
    dome = np.clip(1 - dist * 1.9, 0, 1)
    edge = smoothstep(0.4, 0.5, dist) * smoothstep(0.75, 0.5, dist)
    return dome, edge


def body_texture(W=512, H=256):
    S, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    A = Vv * 2 * math.pi
    d = (1 + np.cos(A)) / 2  # 1 せなか → 0 おなか
    pal = PALETTE[KIND]
    red = np.array(pal['red'])
    red2 = np.array(pal['red2'])
    white = np.array(pal['white'])
    col = red * d[..., None] + red2 * (1 - d[..., None])  # おなかは すこし あかるい
    # さらさ（あかと しろの もよう）
    if pal['white_amount'] > 0:
        wm = blobs(S, Vv, 9 + PATTERN * 3, (0.1, 0.26))
        wm = np.maximum(wm, smoothstep(0.35, 0.05, d) * 0.9)  # おなかは しろい
        wm = smoothstep(0.5 - pal['white_amount'] * 0.5, 0.62 - pal['white_amount'] * 0.5, wm) * (0.6 + 0.4 * (PATTERN % 2))
        col = col * (1 - wm[..., None]) + white * wm[..., None]
    if KIND == 'tancho':
        # あたまの うえだけ まっか（にくりゅうの した）
        cap = smoothstep(0.83, 0.87, S) * smoothstep(0.97, 0.95, S) * smoothstep(0.5, 0.72, d)
        col = col * (1 - cap[..., None]) + np.array([0.86, 0.12, 0.05]) * cap[..., None]
    dome, edge = scale_field(S, Vv, *SP['scales'])
    # あたまには うろこが ない
    body_part = smoothstep(0.84, 0.77, S)
    dome = dome * body_part
    edge = edge * body_part
    height = dome * 0.5 - edge * 0.4
    shade = 1 - 0.16 * edge
    if KIND == 'demekin':
        shade = 1 - 0.06 * edge  # ビロードの ような からだ
    col = col * shade[..., None] + (dome ** 3 * (0.04 if KIND != 'demekin' else 0.015))[..., None]
    if SP.get('pearl'):
        # ちんじゅりん：うろこの まんなかが しろく まるく もりあがる
        pearl = body_part * np.clip(1 - np.hypot(((S * SP['scales'][0] + 0.5 * (np.floor(Vv * SP['scales'][1] * 2) % 2)) % 1 - 0.5), ((Vv * SP['scales'][1] * 2) % 1 - 0.5) * 0.9) * 3.2, 0, 1)
        col = col * (1 - 0.55 * pearl[..., None] ** 1.5) + np.array([1.0, 0.97, 0.92]) * 0.55 * pearl[..., None] ** 1.5
        height = height + pearl ** 0.6 * 0.9
    # えらぶた・くち
    gill = smoothstep(0.015, 0.004, np.abs(S - 0.79)) * smoothstep(0.12, 0.25, d) * smoothstep(0.92, 0.78, d)
    col *= (1 - 0.1 * gill)[..., None]
    col *= (1 - 0.35 * smoothstep(0.975, 0.995, S))[..., None]
    img = np.concatenate([np.clip(col, 0, 1), np.ones((H, W, 1))], axis=2)
    return img, height


def normal_from_height(h, strength=4.0):
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    n = np.stack([-dx, -dy, np.ones_like(h)], axis=2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return np.concatenate([n * 0.5 + 0.5, np.ones(h.shape + (1,))], axis=2)


FIN_COLORS = {
    'wakin': ([0.95, 0.45, 0.14], [0.98, 0.92, 0.86], 0.85, 0.5),
    'ryukin': ([0.93, 0.33, 0.1], [0.99, 0.86, 0.8], 0.8, 0.45),
    'pinpon': ([0.97, 0.55, 0.18], [0.99, 0.93, 0.86], 0.78, 0.45),
    'demekin': ([0.08, 0.07, 0.1], [0.14, 0.12, 0.16], 0.92, 0.72),
    'tancho': ([0.97, 0.95, 0.94], [0.99, 0.97, 0.97], 0.62, 0.35),
}


def fin_texture(W=256, H=128):
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    r = 1 - Vv  # ねもと 0 → さき 1
    base, tip, a0, a1 = FIN_COLORS[KIND]
    f = (U * 10) % 1
    ray = smoothstep(0.1, 0.02, np.minimum(f, 1 - f))
    k = smoothstep(0.2, 0.95, r)[..., None]
    col = np.array(base) * (1 - k) + np.array(tip) * k
    col = col * (1 - 0.22 * ray[..., None])
    alpha = a0 - (a0 - a1) * r + 0.12 * ray
    return np.concatenate([np.clip(col, 0, 1), np.clip(alpha, 0, 1)[..., None]], axis=2)


def make_image(name, arr, non_color=False):
    h, w, _ = arr.shape
    if not non_color:
        # Blender は ここに いれた いろを「リニア」と して あつかうので、みた めの いろ（sRGB）から なおして いれる
        arr = arr.copy()
        c = arr[..., :3]
        arr[..., :3] = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    img.pack()
    return img


def make_material(name, image=None, normal=None, color=(1, 1, 1, 1), rough=0.4, metal=0.0, alpha=False):
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
    if normal:
        nt_tex = nt.nodes.new('ShaderNodeTexImage')
        nt_tex.image = normal
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = 1.0
        nt.links.new(nt_tex.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
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
    N, M = 72, 40
    ss = [1 - (1 - i / N) ** 1.25 for i in range(N)]
    rings = [[bm.verts.new(P(*section(s, 2 * math.pi * j / M))) for j in range(M)] for s in ss]
    snout = bm.verts.new(P(0, mid(1), 0.5 + 0.004))
    tail = bm.verts.new(P(0, mid(0), Z(0) - 0.002))
    for i in range(N - 1):
        for j in range(M):
            j1 = j + 1
            f = bm.faces.new((rings[i][j], rings[i][j1 % M], rings[i + 1][j1 % M], rings[i + 1][j]))
            for loop, (si, jj) in zip(f.loops, [(ss[i], j), (ss[i], j1), (ss[i + 1], j1), (ss[i + 1], j)]):
                loop[uvl].uv = (si, jj / M)
    for j in range(M):
        j1 = j + 1
        f = bm.faces.new((rings[-1][j], rings[-1][j1 % M], snout))
        for loop, (si, jj) in zip(f.loops, [(ss[-1], j), (ss[-1], j1), (1.0, j + 0.5)]):
            loop[uvl].uv = (si, jj / M)
        f = bm.faces.new((rings[0][j1 % M], rings[0][j], tail))
        for loop, (si, jj) in zip(f.loops, [(0, j1), (0, j), (0, j + 0.5)]):
            loop[uvl].uv = (si, jj / M)
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
    d = SP['dorsal']
    if d:
        prof = lambda s: math.sin(math.pi * (0.04 + 0.96 * s)) ** 0.45 * (0.55 + 0.45 * s)
        fin_strip(bm, uvl,
                  lambda s: (0, top(d['t'][0] + (d['t'][1] - d['t'][0]) * s) - 0.004, Z(d['t'][0] + (d['t'][1] - d['t'][0]) * s)),
                  lambda s: (0, top(d['t'][0] + (d['t'][1] - d['t'][0]) * s) + d['h'] * prof(s),
                             Z(d['t'][0] + (d['t'][1] - d['t'][0]) * s) - d['h'] * prof(s) * d['sweep']),
                  n=16, m=8, rays=2.0)
    a = SP['anal']
    sides = [a['double'], -a['double']] if a.get('double') else [0]
    for side in sides:
        prof = lambda s: math.sin(math.pi * (0.05 + 0.95 * s)) ** 0.4
        fin_strip(bm, uvl,
                  lambda s: (side * 0.1 * wid(0.2), bot(a['t'][0] + (a['t'][1] - a['t'][0]) * s) + 0.004, Z(a['t'][0] + (a['t'][1] - a['t'][0]) * s)),
                  lambda s: (side, bot(a['t'][0] + (a['t'][1] - a['t'][0]) * s) - a['h'] * prof(s),
                             Z(a['t'][0] + (a['t'][1] - a['t'][0]) * s) - a['h'] * 0.6 * prof(s)),
                  n=8, m=7, rays=0.8)
    t = SP['tail']
    split = t.get('split', 0)
    for side in ([1, -1] if split else [0]):
        def edge(s, side=side):
            m_ = math.sin(math.pi * s)
            e_ = abs(2 * s - 1)
            lz = (1 - t['fork'] * m_ ** 1.2) * (1 - t.get('round', 0) * e_ ** 6)
            y = mid(0) + (2 * s - 1) * t['span'] * (1 - 0.15 * e_ ** 6) + t.get('lift', 0) * (1 - m_)
            return (side * split * (0.6 + 0.4 * (1 - m_)), y, ZT - t['len'] * lz)
        fin_strip(bm, uvl,
                  lambda s: (0, bot(0.03) + (top(0.03) - bot(0.03)) * s, Z(0.03)),
                  edge, n=20, m=10, rays=2.6,
                  curve_fn=lambda s: (0, -t.get('droop', 0) * (0.5 + 0.5 * math.sin(math.pi * s)), 0))
    # むなびれ・はらびれ（ひだり みぎ）
    for side in (1, -1):
        s0 = 0.74
        bx = side * wid(s0) * 0.9
        by = mid(s0) - (top(s0) - bot(s0)) * 0.22
        pc = SP['pect']
        fin_strip(bm, uvl,
                  lambda s, bx=bx, by=by: (bx, by - 0.01 + 0.02 * s, Z(s0) - 0.004 * s),
                  lambda s, bx=bx, by=by, side=side: (bx + side * pc * 0.5, by - pc * 0.45 + pc * 0.5 * s, Z(s0) - pc * (0.75 + 0.2 * math.sin(math.pi * s))),
                  n=8, m=6, rays=0.9)
        s1 = 0.5
        pv = SP['pelvic']
        px = side * wid(s1) * 0.45
        py = bot(s1) + 0.01
        fin_strip(bm, uvl,
                  lambda s, px=px, py=py: (px, py, Z(s1) - 0.03 * s),
                  lambda s, px=px, py=py, side=side: (px + side * pv * 0.3, py - pv * (1 - 0.45 * s), Z(s1) - pv * 0.55 - 0.03 * s),
                  n=5, m=5, rays=0.6)
    return new_object('fins', bm, material)


def sphere_into(bm, center, scale, u=18, v=12):
    geom = bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1)
    for vert in geom['verts']:
        lx, ly, lz = vert.co.x, vert.co.z, -vert.co.y
        vert.co = P(center[0] + lx * scale[0], center[1] + ly * scale[1], center[2] + lz * scale[2])


def build_eyes(iris_mat, pupil_mat, stalk_mat):
    e = SP['eye']
    s0, a0, er = e['s'], e['a'], e['r']
    bi, bp, bs = bmesh.new(), bmesh.new(), bmesh.new()
    for side in (1, -1):
        a = a0 if side > 0 else -a0
        x, y, z = section(s0, a)
        n = outward(s0, a)
        if e.get('telescope'):
            # でめきん：めが つつの さきに とびだす
            L = e['telescope']
            tip = np.array([x, y, z]) + n * L + np.array([0, 0.004, 0.006])
            for k in range(7):
                q = k / 6
                c = np.array([x, y, z]) * (1 - q) + tip * q - n * 0.01
                rr = er * (0.62 + 0.3 * q)
                sphere_into(bs, c, (rr, rr, rr), 14, 10)
            sphere_into(bi, tip, (er, er, er), 22, 14)
            pc = tip + n * er * 0.72
            sphere_into(bp, pc, (er * 0.5 if abs(n[0]) < 0.5 else er * 0.34, er * 0.62, er * 0.62))
        else:
            c = np.array([x, y, z]) - n * er * 0.35
            sphere_into(bi, c, (er * 0.42, er, er))
            pc = np.array([x, y, z]) + n * er * 0.06
            sphere_into(bp, pc, (er * 0.3, er * 0.6, er * 0.6))
    for bm in (bi, bp, bs):
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    new_object('iris', bi, iris_mat)
    new_object('pupil', bp, pupil_mat)
    if e.get('telescope'):
        new_object('stalk', bs, stalk_mat)
    else:
        bs.free()


def build_wen(mat):
    """にくりゅう：あたまの うえの つぶつぶ（たんちょうは あかい）"""
    bm = bmesh.new()
    count = 420
    for _ in range(count):
        s = 0.84 + rng.random() * 0.12
        a = (rng.random() - 0.5) * 2.1
        x, y, z = section(s, a)
        n = outward(s, a)
        r = 0.007 + rng.random() * 0.007
        c = np.array([x, y, z]) + n * r * 0.1
        sphere_into(bm, c, (r, r * 0.9, r), 7, 5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_object('wen', bm, mat)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    tex, height = body_texture()
    body_img = make_image(f'{NAME}_body', tex)
    nrm_img = make_image(f'{NAME}_normal', normal_from_height(height, 5 if SP.get('pearl') else 3), non_color=True)
    fin_img = make_image(f'{NAME}_fin', fin_texture())
    velvet = KIND == 'demekin'
    body_mat = make_material('body', body_img, nrm_img, rough=0.62 if velvet else 0.4, metal=0.0 if velvet else 0.06)
    fin_mat = make_material('fin', fin_img, rough=0.5, alpha=True)
    iris = make_material('iris', color=(0.1, 0.08, 0.07, 1) if velvet else (0.85, 0.66, 0.3, 1), rough=0.35, metal=0.5)
    pupil = make_material('pupil', color=(0.01, 0.01, 0.01, 1), rough=0.05)
    stalk = make_material('stalk', color=(0.06, 0.05, 0.08, 1), rough=0.6)
    build_body(body_mat)
    build_fins(fin_mat)
    build_eyes(iris, pupil, stalk)
    if SP.get('wen'):
        build_wen(make_material('wen', color=(0.55, 0.012, 0.006, 1), rough=0.55))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
    print('EXPORTED', OUT, os.path.getsize(OUT))


main()
