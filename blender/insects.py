# むしの 3D モデルを Blender で つくって models/bug_*.glb に かきだす。
#   つかいかた（math-app フォルダで）:
#     "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python blender/insects.py -- kabuto
#     しゅるい：kabuto（カブトムシ）・kanabun（カナブン）・kokuwa・nokogiri・miyama・ookuwa（クワガタ）
#   ふつうは node blender/build.mjs で ぜんぶ つくる
#
# アプリ（pet3d.js）での きまり：
#   ・ながさ やく 1（あたま +z、おしり -z）、あしの さきが y=0（じめん）
#   ・うごく ところは から（Empty）の したに ある。から の いちが ふしの まわる ところ
#     leg_<0〜2>_<L|R>：あし（アプリで ふって あるかせる）、head：あたま、
#     ant_<L|R>：しょっかく、jaw_<L|R>：おおあご（ひらく）、horn：つの（おおきさで のばす）

import math
import os
import sys

import bmesh
import bpy
import numpy as np

KIND = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'kabuto'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'models', f'bug_{KIND}.raw.glb')
rng = np.random.default_rng(sum(map(ord, KIND)) * 31 + 7)


def P(x, y, z):
    """アプリの ざひょう（x よこ・y うえ・z まえ）→ Blender の ざひょう"""
    return (x, -z, y)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def norm(v):
    v = np.asarray(v, dtype=float)
    return v / (np.linalg.norm(v) + 1e-9)


# ---------- しゅるいごとの ようす ----------
# light / dark：からの いろ（うえ・ふち）、coat：つや、hair：きんいろの け（ミヤマ）、metal：きんぞくの ひかり（カナブン）
SPEC = {
    'kabuto': dict(kind='kabuto', light=(0.36, 0.14, 0.07), dark=(0.07, 0.025, 0.015), leg=(0.14, 0.06, 0.035), rough=0.28, coat=1.0),
    'kanabun': dict(kind='kabuto', light=(0.22, 0.52, 0.26), dark=(0.04, 0.16, 0.08), leg=(0.08, 0.14, 0.09), rough=0.22, coat=1.0, metal=0.6, nohorn=True),
    'kokuwa': dict(kind='kuwa', light=(0.2, 0.16, 0.13), dark=(0.03, 0.025, 0.02), leg=(0.1, 0.08, 0.07), rough=0.4, coat=0.4,
                   jaw=0.6, head=0.17, tooth='small', striae=True),
    'nokogiri': dict(kind='kuwa', light=(0.4, 0.15, 0.06), dark=(0.07, 0.025, 0.012), leg=(0.16, 0.06, 0.03), rough=0.28, coat=1.0,
                     jaw=1.05, head=0.21, tooth='saw', curve=0.9),
    'miyama': dict(kind='kuwa', light=(0.42, 0.32, 0.18), dark=(0.1, 0.07, 0.04), leg=(0.16, 0.11, 0.06), rough=0.6, coat=0.1,
                   jaw=1.0, head=0.24, tooth='fork', ears=True, hair=True),
    'ookuwa': dict(kind='kuwa', light=(0.16, 0.16, 0.18), dark=(0.015, 0.015, 0.018), leg=(0.07, 0.07, 0.075), rough=0.3, coat=0.9,
                   jaw=0.8, head=0.22, tooth='big', thick=True, striae=True, curve=0.6),
}
SP = SPEC[KIND]


# ---------- がぞう・ざいしつ ----------

def value_noise(W, H, cells):
    g = rng.random((cells, cells))
    ys = np.arange(H) / H * cells
    xs = np.arange(W) / W * cells
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    ty = ys - y0
    tx = xs - x0
    ty = ty * ty * (3 - 2 * ty)
    tx = tx * tx * (3 - 2 * tx)
    y1 = (y0 + 1) % cells
    x1 = (x0 + 1) % cells
    top = g[y0][:, x0] * (1 - tx) + g[y0][:, x1] * tx
    bot = g[y1][:, x0] * (1 - tx) + g[y1][:, x1] * tx
    return top * (1 - ty[:, None]) + bot * ty[:, None]


def shell_texture(front=False):
    """から：うえから みた ひらいた もよう（u＝よこ、v＝まえうしろ）。ふちは くらく、こまかい てんてん
    front：むね・あたま よう（はねの あわせめ・すじは ない）"""
    W = H = 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    light = np.array(SP['light'])
    dark = np.array(SP['dark'])
    edge = np.abs(U - 0.5) * 2
    k = smoothstep(0.95, 0.25, edge) * (0.7 + 0.3 * value_noise(W, H, 8))
    col = dark * (1 - k[..., None]) + light * k[..., None]
    # まんなかの あわせめ（はねだけ）
    if not front:
        col *= (1 - 0.6 * smoothstep(0.012, 0.0, np.abs(U - 0.5)))[..., None]
    if SP.get('striae') and not front:
        f = (U * 14) % 1
        col *= (1 - 0.35 * smoothstep(0.08, 0.0, np.minimum(f, 1 - f)))[..., None]
    pits = rng.random((H, W)) > 0.96
    col[pits] *= 0.7
    if SP.get('hair'):
        # ミヤマ：きんいろの こまかい け
        h = value_noise(W, H, 64) * value_noise(W, H, 16)
        col = col * 0.8 + np.array([0.55, 0.42, 0.2]) * (h[..., None] * 0.45)
    arr = np.concatenate([np.clip(col, 0, 1), np.ones((H, W, 1))], axis=2)
    img = bpy.data.images.new('shell_front' if front else 'shell', W, H, alpha=True)
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.pack()
    return img


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, color=(1, 1, 1), img=None, rough=0.4, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.1
    if img:
        t = m.node_tree.nodes.new('ShaderNodeTexImage')
        t.image = img
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m


# ---------- かたちの どうぐ ----------

def empty(name, pos, parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = P(*pos)
    bpy.context.scene.collection.objects.link(e)
    if parent:
        e.parent = parent
    return e


def mesh_obj(name, bm, mat, parent=None, smooth=True):
    """parent の なかの ざひょうで つくった bm を おく（から の いちは あとで parent が うごかす）"""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


class Builder:
    """1つの ざいしつの かたちを あつめる"""

    def __init__(self):
        self.bm = bmesh.new()
        self.uvl = self.bm.loops.layers.uv.new('UVMap')

    def blob(self, center, radii, e=1.0, deform=None, seg=32, uvbox=None):
        """かどの まるい はこ〜だえんたい（e < 1 で はこに ちかい）。uv は うえから みた ひらき"""
        geom = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(8, int(seg * 0.7)), radius=1)
        cx, cy, cz = center
        for v in geom['verts']:
            x, y, z = v.co.x, v.co.z, -v.co.y
            f = lambda a: math.copysign(abs(a) ** e, a)
            p = np.array([f(x), f(y), f(z)]) * np.array(radii)
            if deform:
                p = deform(p / np.array(radii), p)
            v.co = P(cx + p[0], cy + p[1], cz + p[2])
        box = uvbox or (radii[0], radii[2])
        faces = {f for v in geom['verts'] for f in v.link_faces}
        for f in faces:
            for loop in f.loops:
                co = loop.vert.co
                x, z = co.x - cx, -co.y - cz
                loop[self.uvl].uv = (0.5 + x / (2 * box[0]), 0.5 + z / (2 * box[1]))

    def tube(self, path, radii, ring=8, flat=1.0, cap=True):
        path = [np.asarray(p, dtype=float) for p in path]
        n = len(path)
        tans = [norm(path[min(i + 1, n - 1)] - path[max(i - 1, 0)]) for i in range(n)]
        ref = np.array([0, 1, 0]) if abs(tans[0][1]) < 0.9 else np.array([1, 0, 0])
        nrm = norm(np.cross(np.cross(tans[0], ref), tans[0]))
        rings = []
        for i in range(n):
            if i:
                nrm = norm(nrm - np.dot(nrm, tans[i]) * tans[i])
            bi = np.cross(tans[i], nrm)
            rings.append([self.bm.verts.new(P(*(path[i] + (math.cos(a) * nrm * flat + math.sin(a) * bi) * radii[i])))
                          for a in np.linspace(0, 2 * math.pi, ring, endpoint=False)])
        for i in range(n - 1):
            for j in range(ring):
                f = self.bm.faces.new((rings[i][j], rings[i][(j + 1) % ring], rings[i + 1][(j + 1) % ring], rings[i + 1][j]))
                for loop in f.loops:
                    loop[self.uvl].uv = (j / ring, i / n)
        if cap:
            for k in (0, n - 1):
                c = self.bm.verts.new(P(*path[k]))
                for j in range(ring):
                    try:
                        self.bm.faces.new((rings[k][j], rings[k][(j + 1) % ring], c))
                    except ValueError:
                        pass

    def cone(self, a, b, r):
        self.tube([a, (np.asarray(a) + np.asarray(b)) / 2, b], [r, r * 0.55, 0.0005], ring=6)

    def taper(self, pts, r0, r1, n=20, ring=10):
        """なめらかに まがる だんだん ほそく なる つつ（つの・あご）"""
        pts = [np.asarray(p, dtype=float) for p in pts]
        path = []
        for i in range(n + 1):
            t = i / n * (len(pts) - 1)
            k = min(int(t), len(pts) - 2)
            f = t - k
            p0 = pts[max(k - 1, 0)]
            p1, p2 = pts[k], pts[k + 1]
            p3 = pts[min(k + 2, len(pts) - 1)]
            path.append(0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3))
        self.tube(path, [r0 + (r1 - r0) * (i / n) ** 0.9 for i in range(n + 1)], ring=ring)
        return path


# ---------- あし ----------

def build_leg(name, hip, s, L, hipY, thick, fwd, spines, mat, root):
    """あし 1ぽん：から（ふしの いち）の したに つくる。つけね → もも → すね（とげ）→ ふせつ → つめ"""
    e = empty(name, hip, root)
    b = Builder()
    coxa = np.array([s * L * 0.07, -hipY * 0.1, fwd * 0.03])
    knee = np.array([s * L * 0.4, L * 0.13, fwd * 0.3])
    ankle = np.array([s * L * 0.74, -hipY + L * 0.06, fwd * 0.72])
    toe = np.array([s * L * 1.02, -hipY + 0.004, fwd * 1.05 + L * 0.06])
    b.blob((0, 0, 0), (thick * 1.4, thick * 1.2, thick * 1.4), seg=10)
    b.tube([np.zeros(3), coxa], [thick * 1.3, thick * 1.2], ring=8)
    mid = (coxa + knee) / 2 + np.array([0, L * 0.02, 0])
    b.tube([coxa, mid, knee], [thick * 1.3, thick * 1.45, thick * 1.0], ring=10, flat=0.7)  # ひらたい もも
    b.blob(tuple(knee), (thick, thick, thick), seg=10)
    b.tube([knee, (knee + ankle) / 2, ankle], [thick * 0.75, thick * 0.95, thick * 1.1], ring=8)
    for i in range(1, spines + 1):
        q = knee + (ankle - knee) * (0.3 + 0.65 * i / (spines + 1))
        b.cone(q, q + np.array([s * L * 0.06, L * 0.02, L * 0.02]), thick * 0.32)
    for c in (-1, 1):
        b.cone(ankle, ankle + np.array([s * L * 0.02, -L * 0.03, c * L * 0.04]), thick * 0.3)
    prev = ankle
    for i in range(1, 6):
        q = ankle + (toe - ankle) * (i / 5)
        q = q + np.array([0, math.sin(i / 5 * math.pi) * L * 0.02, 0])
        r = thick * (0.55 - i * 0.05)
        b.tube([prev, q], [r * 1.1, r * 0.8], ring=6)
        b.blob(tuple(q), (r, r, r), seg=8)
        prev = q
    d = norm(toe - ankle)
    for c in (-1, 1):
        side = np.array([-d[2], 0, d[0]]) * c * L * 0.025
        b.taper([toe, toe + d * L * 0.04 + side + np.array([0, 0.002, 0]), toe + d * L * 0.06 + side + np.array([0, -L * 0.025, 0])], thick * 0.28, thick * 0.05, n=6, ring=6)
    mesh_obj(name + '_mesh', b.bm, mat, e)
    return e


def build_legs(root, mat, hips, side, lens, hipY, thick, spread, spines):
    for i, z in enumerate(hips):
        for s, tag in ((-1, 'R'), (1, 'L')):
            build_leg(f'leg_{i}_{tag}', (s * side, hipY, z), s, lens[i], hipY, thick, lens[i] * spread[i], spines[i], mat, root)


# ---------- からだ ----------

def build_kabuto(root, shell, legm, dark, under, eye, front):
    kana = SP.get('nohorn')
    b = Builder()
    # はね（せなかが たかく もりあがる。おしりに むかって すこし ほそく）
    def elytra(u, p):
        if u[1] < 0:
            p[1] *= 0.55
        p[0] *= 1 - 0.22 * max(0.0, -u[2]) ** 2
        p[1] -= 0.012 * math.exp(-(p[0] / 0.012) ** 2) * max(0.0, u[1])  # あわせめの みぞ
        return p
    b.blob((0, 0.27, -0.3), (0.28 if not kana else 0.26, 0.17 if not kana else 0.13, 0.36), e=0.78, deform=elytra, seg=44)
    mesh_obj('shell', b.bm, shell, root)
    b = Builder()
    # むね（まえが なだらかに さがる）
    def pron(u, p):
        if u[1] < 0:
            p[1] *= 0.5
        p[1] -= 0.06 * max(0.0, u[2]) ** 2 * (1 if u[1] > 0 else 0)
        return p
    b.blob((0, 0.27, 0.13), (0.25 if not kana else 0.2, 0.15 if not kana else 0.12, 0.19 if not kana else 0.15), e=0.82, deform=pron, seg=40, uvbox=(0.28, 0.36))
    if not kana:
        # むねの つの：みじかく まえに つきでて、さきが ふたまた
        tip = np.array([0, 0.47, 0.37])
        b.taper([(0, 0.4, 0.2), (0, 0.45, 0.3), tip], 0.045, 0.018, n=12)
        for s in (-1, 1):
            b.taper([tip, tip + np.array([s * 0.02, 0.004, 0.025])], 0.016, 0.003, n=4, ring=6)
    mesh_obj('pronotum', b.bm, front, root)
    u = Builder()
    u.blob((0, 0.16, -0.18), (0.24, 0.08, 0.42), seg=24)
    if not kana:
        u.blob((0, 0.24, 0.26), (0.11, 0.08, 0.07), seg=16)
    mesh_obj('under', u.bm, under, root)
    # あたま
    head = empty('head', (0, 0.15, 0.31) if kana else (0, 0.15, 0.4), root)
    h = Builder()
    h.blob((0, 0, 0), (0.1, 0.06, 0.09) if kana else (0.12, 0.07, 0.11), e=0.9, seg=24)
    mesh_obj('head_shell', h.bm, front, head)
    ey = Builder()
    for s in (-1, 1):
        ey.blob((s * 0.1, 0.02, 0.03), (0.03, 0.03, 0.03), seg=14)
    mesh_obj('eyes', ey.bm, eye, head)
    for s, tag in ((-1, 'R'), (1, 'L')):
        a = empty(f'ant_{tag}', (s * 0.09, 0, 0.08), head)
        ab = Builder()
        ab.tube([(0, 0, 0), (s * 0.05, -0.01, 0.06)], [0.008, 0.007], ring=6)
        for i in (-1, 0, 1):
            ab.blob((s * 0.06, -0.01 + i * 0.015, 0.09), (0.006, 0.02, 0.035), seg=8)
        mesh_obj(f'ant_{tag}_mesh', ab.bm, legm, a)
    if not kana:
        # あたまの つの：まえに のびて うえに おおきく そり、さきが 2かい わかれる
        horn = empty('horn', (0, 0.03, 0.08), head)
        hb = Builder()
        pts = [(0, 0, 0), (0, 0.03, 0.16), (0, 0.13, 0.3), (0, 0.3, 0.39), (0, 0.47, 0.38)]
        hb.taper(pts, 0.075, 0.034, n=28, ring=12)
        tip = np.array(pts[-1])
        for s in (-1, 1):
            mid = tip + np.array([s * 0.05, 0.06, -0.02])
            hb.taper([tip, tip + np.array([s * 0.025, 0.03, 0]), mid], 0.032, 0.02, n=8)
            for t in (-1, 1):
                hb.taper([mid, mid + np.array([s * 0.02 + t * 0.012, 0.035, -0.01 + t * 0.012]), mid + np.array([s * 0.03 + t * 0.025, 0.06, -0.02 + t * 0.02])], 0.02, 0.004, n=8, ring=8)
        mesh_obj('horn_mesh', hb.bm, dark, horn)
    build_legs(root, legm, hips=[0.25, 0.08, -0.07], side=0.16, lens=[0.46, 0.44, 0.48] if kana else [0.62, 0.52, 0.58],
               hipY=0.17, thick=0.027 if kana else 0.034, spread=[0.55, 0.05, -0.55], spines=[4, 2, 2])


def build_kuwa(root, shell, legm, dark, under, eye, front):
    b = Builder()
    def elytra(u, p):
        if u[1] < 0:
            p[1] *= 0.5
        p[0] *= 1 - 0.2 * max(0.0, -u[2]) ** 3
        p[1] -= 0.01 * math.exp(-(p[0] / 0.012) ** 2) * max(0.0, u[1])
        return p
    b.blob((0, 0.22, -0.26), (0.25, 0.13, 0.4), e=0.7, deform=elytra, seg=44)
    mesh_obj('shell', b.bm, shell, root)
    b = Builder()
    # むね：はねと おなじくらい ひろく、かどが ある
    def pron(u, p):
        if u[1] < 0:
            p[1] *= 0.5
        return p
    b.blob((0, 0.225, 0.3), (0.26, 0.115, 0.13), e=0.78, deform=pron, seg=36, uvbox=(0.26, 0.4))
    mesh_obj('pronotum', b.bm, front, root)
    u = Builder()
    u.blob((0, 0.13, -0.18), (0.22, 0.07, 0.42), seg=24)
    u.blob((0, 0.2, 0.2), (0.11, 0.06, 0.05), seg=16)
    mesh_obj('under', u.bm, under, root)
    hw = SP['head'] * 1.0
    head = empty('head', (0, 0.2, 0.5), root)
    h = Builder()
    h.blob((0, 0, 0), (hw, 0.08, 0.12), e=0.78, seg=32, uvbox=(0.26, 0.4))
    if SP.get('ears'):
        for s in (-1, 1):
            h.blob((s * hw * 0.92, 0.015, -0.03), (0.06, 0.06, 0.08), e=0.9, seg=16)
    mesh_obj('head_shell', h.bm, front, head)
    ey = Builder()
    for s in (-1, 1):
        ey.blob((s * hw * 0.88, 0.01, 0.06), (0.03, 0.028, 0.03), seg=14)
    mesh_obj('eyes', ey.bm, eye, head)
    for s, tag in ((-1, 'R'), (1, 'L')):
        a = empty(f'ant_{tag}', (s * hw * 0.7, 0.01, 0.1), head)
        ab = Builder()
        ab.tube([(0, 0, 0), (s * 0.14, 0.02, 0.04)], [0.008, 0.007], ring=6)
        ab.tube([(s * 0.14, 0.02, 0.04), (s * 0.19, 0.02, 0.12)], [0.006, 0.006], ring=6)
        for i in range(4):
            ab.blob((s * (0.19 + i * 0.011), 0.02, 0.12 + i * 0.006), (0.006, 0.018, 0.012), seg=8)
        mesh_obj(f'ant_{tag}_mesh', ab.bm, legm, a)
    # おおあご
    L = SP['jaw']
    r0 = 0.058 if SP.get('thick') else 0.045
    bend = SP.get('curve', 0.3)
    for s, tag in ((-1, 'R'), (1, 'L')):
        j = empty(f'jaw_{tag}', (s * hw * 0.55, -0.005, 0.1), head)
        jb = Builder()
        pts = [(0, 0, 0), (s * 0.06, 0.01, 0.12 * L), (s * 0.05, 0.02 - 0.02 * bend, 0.26 * L), (-s * 0.05 * bend, 0.015 - 0.03 * bend, 0.36 * L)]
        path = jb.taper(pts, r0, 0.006, n=28, ring=10)
        def tooth(u, size, up=0.0):
            q = path[min(len(path) - 1, int(u * (len(path) - 1)))]
            jb.cone(q, q + np.array([-s * size, up, size * 0.3]), size * 0.35)
        if SP['tooth'] == 'saw':
            for i in range(8):
                tooth(0.22 + i * 0.075, 0.028)
        if SP['tooth'] == 'big':
            tooth(0.4, 0.065, 0.01)
        if SP['tooth'] == 'small':
            tooth(0.68, 0.035)
        if SP['tooth'] == 'fork':
            for uu in (0.35, 0.5, 0.62):
                tooth(uu, 0.028)
            q = path[int(0.92 * (len(path) - 1))]
            jb.cone(q, q + np.array([0, 0.06, 0.02]), 0.016)
        mesh_obj(f'jaw_{tag}_mesh', jb.bm, dark, j)
    build_legs(root, legm, hips=[0.3, 0.1, -0.08], side=0.15, lens=[0.62, 0.56, 0.62], hipY=0.16, thick=0.03,
               spread=[0.6, 0.05, -0.6], spines=[3, 1, 1])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = empty('bug', (0, 0, 0))
    shell = material('shell', img=shell_texture(), rough=SP['rough'], metal=SP.get('metal', 0.0), coat=SP['coat'])
    legm = material('leg', SP['leg'], rough=0.3, coat=0.8)
    jawc = tuple(SP['light'][i] * 0.55 + SP['dark'][i] * 0.45 for i in range(3))
    dark = material('horn', jawc if SP['kind'] == 'kuwa' else (0.16, 0.06, 0.03), rough=0.28, coat=1.0)
    under = material('under', (0.1, 0.06, 0.045), rough=0.5)
    eye = material('eye', (0.02, 0.02, 0.02), rough=0.05, coat=1.0)
    front = material('shell_front', img=shell_texture(front=True), rough=SP['rough'], metal=SP.get('metal', 0.0), coat=SP['coat'])
    (build_kabuto if SP['kind'] == 'kabuto' else build_kuwa)(root, shell, legm, dark, under, eye, front)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
    print('EXPORTED', OUT, os.path.getsize(OUT))


main()
