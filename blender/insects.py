# むしの 3D モデルを Blender で つくって models/bug_*.glb に かきだす。
#   つかいかた（math-app フォルダで）:
#     "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python blender/insects.py -- kabuto
#     しゅるい：kabuto（カブトムシ）・kanabun（カナブン）・kokuwa・nokogiri・miyama・ookuwa（クワガタ）
#               ant（アリ）・dango（ダンゴムシ）・larva（ようちゅう）・pupa（さなぎ）
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
    # こうちゅう いがい：かたちは それぞれの build_* が きめる
    'ant': dict(kind='ant'),
    'dango': dict(kind='dango'),
    'larva': dict(kind='larva'),   # こうちゅうの ようちゅう（どの しゅるいも これ）
    'pupa': dict(kind='pupa'),     # さなぎ。pupa_horn（カブト）・pupa_jaws（クワガタ）は アプリで だしわける
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

    def blob(self, center, radii, e=1.0, deform=None, seg=32, uvbox=None, uvfn=None):
        """かどの まるい はこ〜だえんたい（e < 1 で はこに ちかい）。uv は うえから みた ひらき
        uvfn(x, y, z)：なかの ざひょうから uv を きめる ときに つかう"""
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
                if uvfn:
                    loop[self.uvl].uv = uvfn(x, co.z - cy, z)
                else:
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

    def spline(self, pts, radii, n=24, ring=14, flat=1.0):
        """とおる てんと ふとさを なめらかに つないだ つつ（アリの むね など）"""
        pts = [np.asarray(p, dtype=float) for p in pts]
        path, rs = [], []
        for i in range(n + 1):
            t = i / n * (len(pts) - 1)
            k = min(int(t), len(pts) - 2)
            f = t - k
            p0, p1, p2, p3 = pts[max(k - 1, 0)], pts[k], pts[k + 1], pts[min(k + 2, len(pts) - 1)]
            path.append(0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3))
            s = f * f * (3 - 2 * f)
            rs.append(radii[k] * (1 - s) + radii[k + 1] * s)
        self.tube(path, rs, ring=ring, flat=flat)
        return path


def image(name, col, alpha=None):
    """(H, W, 3) の いろ（0〜1）を がぞうに する"""
    H, W = col.shape[:2]
    a = np.ones((H, W, 1)) if alpha is None else alpha[..., None]
    img = bpy.data.images.new(name, W, H, alpha=True)
    img.pixels.foreach_set(np.concatenate([np.clip(col, 0, 1), a], axis=2).astype(np.float32).ravel())
    img.pack()
    return img


def rot_y(p, a):
    """アプリの ざひょうで y の まわりに まわす（three.js の rotation.y と おなじ むき）"""
    c, s = math.cos(a), math.sin(a)
    return np.array([p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c])


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


# ---------- アリ ----------

def noise_col(W, H, cells, amp):
    return (1 + amp * (value_noise(W, H, cells) - 0.5))[..., None]


def ant_texture(front):
    """くろくて つやの ある から。はらの ふしの うしろの ふちは すこし あかるく、きんいろの うぶげが ぽつぽつ"""
    W = H = 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    dark = np.array([0.04, 0.03, 0.026])
    light = np.array([0.17, 0.11, 0.085])
    k = smoothstep(0.95, 0.2, np.abs(U - 0.5) * 2)[..., None]
    col = (dark * (1 - k) + light * k) * noise_col(W, H, 10, 0.5)
    if not front:
        amber = np.array([0.3, 0.19, 0.11])
        for b in (0.25, 0.5, 0.75):
            d = Vv - b
            band = ((d > 0) * smoothstep(0.035, 0.0, d))[..., None] * 0.65
            col = col * (1 - band) + amber * band
    hair = rng.random((H, W)) > 0.985
    col[hair] = col[hair] * 0.4 + np.array([0.42, 0.34, 0.24]) * 0.6
    return image('ant_front' if front else 'ant_body', col)


def build_ant(root):
    body = material('ant_body', img=ant_texture(False), rough=0.3, coat=0.9)
    front = material('ant_front', img=ant_texture(True), rough=0.32, coat=0.9)
    limb = material('leg', (0.13, 0.08, 0.06), rough=0.45, coat=0.5)
    eye = material('eye', (0.02, 0.02, 0.02), rough=0.05, coat=1.0)
    # はら：4まいの いたが かさなる（まえの いたが うしろに かぶさる）
    def gaster(u, p):
        f = ((1 - u[2]) / 2 * 4) % 1
        k = 0.955 + 0.045 * f
        p[0] *= k
        p[1] *= k
        p[1] -= 0.03 * max(0.0, -u[2]) ** 2
        return p
    b = Builder()
    b.blob((0, 0.25, -0.31), (0.17, 0.145, 0.22), deform=gaster, seg=44)
    mesh_obj('gaster', b.bm, body, root)
    # むね：まえが まるく もりあがり、うしろに むかって ひくく なる。こしの ふしは たての こぶ
    b = Builder()
    b.spline([(0, 0.275, 0.26), (0, 0.29, 0.19), (0, 0.262, 0.09), (0, 0.238, 0.02), (0, 0.242, -0.035)],
             [0.03, 0.07, 0.058, 0.05, 0.03], n=32, ring=16, flat=1.15)
    b.blob((0, 0.242, -0.035), (0.03, 0.034, 0.03), seg=12)
    b.spline([(0, 0.238, -0.03), (0, 0.232, -0.07), (0, 0.236, -0.115)], [0.02, 0.018, 0.03], n=8, ring=10)
    b.blob((0, 0.255, -0.07), (0.034, 0.062, 0.026), seg=16)
    mesh_obj('thorax', b.bm, front, root)
    # あたま（うしろが すこし ひろい）・おおあご・め
    head = empty('head', (0, 0.29, 0.34), root)
    h = Builder()
    def hd(u, p):
        p[0] *= 1 + 0.12 * max(0.0, -u[2])
        return p
    h.blob((0, 0, 0), (0.105, 0.092, 0.11), e=0.85, deform=hd, seg=32)
    mesh_obj('head_shell', h.bm, front, head)
    m = Builder()
    for s in (-1, 1):
        path = m.taper([(s * 0.045, -0.045, 0.08), (s * 0.07, -0.055, 0.14), (s * 0.04, -0.06, 0.19), (s * 0.004, -0.06, 0.2)], 0.02, 0.005, n=14, ring=8)
        for uu in (0.55, 0.7, 0.85):
            q = path[int(uu * (len(path) - 1))]
            m.cone(q, q + np.array([-s * 0.018, -0.004, 0.008]), 0.006)
    mesh_obj('mandibles', m.bm, limb, head)
    ey = Builder()
    for s in (-1, 1):
        ey.blob((s * 0.095, 0.03, 0.035), (0.027, 0.033, 0.03), seg=14)
    mesh_obj('eyes', ey.bm, eye, head)
    # しょっかく：ながい ねもとで くの じに まがり、さきが すこし ふとい
    for s, tag in ((-1, 'R'), (1, 'L')):
        a = empty(f'ant_{tag}', (s * 0.04, 0.045, 0.095), head)
        ab = Builder()
        elbow = np.array([s * 0.09, 0.085, 0.075])
        ab.tube([np.zeros(3), np.array([s * 0.045, 0.045, 0.045]), elbow], [0.009, 0.011, 0.013], ring=8)
        ab.blob(tuple(elbow), (0.014, 0.014, 0.014), seg=10)
        ctrl = np.array([s * 0.16, 0.08, 0.17])
        tip = np.array([s * 0.17, -0.02, 0.26])
        for i in range(1, 11):
            t = i / 10
            q = (1 - t) ** 2 * elbow + 2 * (1 - t) * t * ctrl + t * t * tip
            r = 0.01 + (0.004 if i >= 8 else 0)
            ab.blob(tuple(q), (r, r, r * 1.35), seg=8)
        mesh_obj(f'ant_{tag}_mesh', ab.bm, limb, a)
    build_legs(root, limb, hips=[0.13, 0.07, 0.01], side=0.055, lens=[0.5, 0.52, 0.58], hipY=0.21, thick=0.014,
               spread=[0.5, 0.05, -0.5], spines=[0, 0, 0])


# ---------- ダンゴムシ ----------

def dango_texture(front):
    """はいいろの いた。うしろの ふちと よこは うすい いろ、まんなかに きいろっぽい てんてんが ならぶ"""
    W = H = 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    edge = np.abs(U - 0.5) * 2
    base = np.array([0.19, 0.2, 0.22])
    hi = np.array([0.3, 0.31, 0.33])
    k = smoothstep(0.9, 0.2, edge)[..., None]
    col = (base * (1 - k) + hi * k) * noise_col(W, H, 12, 0.35)
    pale = np.array([0.5, 0.48, 0.44])
    side = smoothstep(0.8, 0.98, edge)[..., None] * 0.5
    col = col * (1 - side) + pale * side
    if not front:
        rim = smoothstep(0.24, 0.04, Vv)[..., None] * 0.55
        col = col * (1 - rim) + pale * rim
        spots = np.zeros_like(U)
        for c in (0.22, 0.4, 0.6, 0.78):
            spots += np.exp(-((U - c) ** 2 / 0.003 + (Vv - 0.55) ** 2 / 0.012))
        spots = np.clip(spots * (0.4 + 0.8 * value_noise(W, H, 16)), 0, 1)[..., None] * 0.45
        col = col * (1 - spots) + np.array([0.56, 0.5, 0.33]) * spots
    pits = rng.random((H, W)) > 0.97
    col[pits] *= 0.75
    return image('dango_head' if front else 'dango_shell', col)


def build_dango(root):
    shell = material('dango_shell', img=dango_texture(False), rough=0.42, coat=0.5)
    front = material('dango_head', img=dango_texture(True), rough=0.42, coat=0.5)
    pale = material('leg', (0.62, 0.57, 0.5), rough=0.6)
    eye = material('eye', (0.02, 0.02, 0.02), rough=0.05, coat=1.0)
    # body：あるいて いる ときの からだ（まるまると かくれて、かわりに ball が でる）
    body = empty('body', (0, 0, 0), root)
    # 1つの まるい ドームに、いたの かさなりの だんを つける（まえの いたが うしろの いたに かぶさる）
    plates = [0.3, 0.32, 0.34, 0.345, 0.34, 0.33, 0.3, 0.24, 0.2, 0.16, 0.12]
    z0, step, cz, rz = 0.4, 0.075, -0.02, 0.44
    idx = lambda z: (z0 - z) / step                      # まえから なんまいめの いたか（こすう つき）
    def width(z):
        t = min(max(idx(z) - 0.5, 0), len(plates) - 1)
        k = int(min(t, len(plates) - 2))
        f = t - k
        return plates[k] * (1 - f) + plates[k + 1] * f
    # まえうしろ（z）× よこの まわり（th）の あみめで つくる。いたの さかいめで がくっと ひくく なる
    b = Builder()
    NZ, NT, TH = 150, 40, math.pi / 2 + 0.25
    rows = []
    for i in range(NZ + 1):
        z = cz + rz * math.cos(math.pi * i / NZ)          # まえ（+z）→ うしろ。はしほど こまかく
        env = math.sqrt(max(0.0, 1 - ((z - cz) / rz) ** 2))
        f = idx(z) % 1
        k = 0.93 + 0.07 * f ** 0.7
        w = width(z) * env ** 0.35 * (0.985 + 0.015 * f)
        h = 0.175 * env ** 0.6 * k
        row = []
        for j in range(NT + 1):
            th = -TH + 2 * TH * j / NT
            row.append(b.bm.verts.new(P(w * math.sin(th), 0.035 + h * math.cos(th), z)))
        rows.append((row, 1 - f))
    for i in range(NZ):
        (ra, va), (rb, vb) = rows[i], rows[i + 1]
        if vb > va + 0.5:
            vb -= 1      # いたの さかいめを またぐ ときは つづきの v に
        for j in range(NT):
            face = b.bm.faces.new((ra[j], rb[j], rb[j + 1], ra[j + 1]))
            for loop, uv in zip(face.loops, ((j / NT, va), (j / NT, vb), ((j + 1) / NT, vb), ((j + 1) / NT, va))):
                loop[b.uvl].uv = uv
    for s in (-1, 1):
        b.cone((s * 0.06, 0.03, -0.42), (s * 0.09, 0.02, -0.5), 0.02)   # しっぽの ちいさな つの
    mesh_obj('shell', b.bm, shell, body)
    h = Builder()
    h.blob((0, 0.05, 0.43), (0.13, 0.075, 0.07), e=0.9, seg=24)
    mesh_obj('head_shell', h.bm, front, body)
    ey = Builder()
    for s in (-1, 1):
        ey.blob((s * 0.1, 0.08, 0.45), (0.02, 0.02, 0.02), seg=10)
    mesh_obj('eyes', ey.bm, eye, body)
    un = Builder()
    un.blob((0, 0.028, -0.01), (0.26, 0.02, 0.4), seg=20)
    mesh_obj('under', un.bm, pale, body)
    for s, tag in ((-1, 'R'), (1, 'L')):
        a = empty(f'ant_{tag}', (s * 0.06, 0.06, 0.48), body)
        ab = Builder()
        ab.tube([(0, 0, 0), (s * 0.03, 0.01, 0.03)], [0.016, 0.013], ring=8)
        for i in range(1, 7):
            t = i / 6
            ab.blob((s * 0.1 * t, 0.02 * math.sin(t * 3), 0.12 * t + 0.01), (0.012, 0.012, 0.02), seg=8)
        mesh_obj(f'ant_{tag}_mesh', ab.bm, pale, a)
    build_legs(root, pale, hips=[0.3, 0.2, 0.1, 0, -0.1, -0.2, -0.3], side=0.13, lens=[0.22] * 7, hipY=0.05, thick=0.009,
               spread=[0.15, 0.05, 0, 0, -0.05, -0.1, -0.15], spines=[0] * 7)
    # ball：まるまった ところ。いたが よこの はしから はしへ おびの ように ならぶ
    K, NT, NP = 11, 176, 28
    ball = Builder()
    rows = []
    for i in range(NT + 1):
        th = 2 * math.pi * i / NT                 # x の まわりの かど（まるまった からだの まえ→うしろ）
        f = (th / (2 * math.pi) * K) % 1
        k = 0.965 + 0.035 * f ** 0.7
        row = []
        for j in range(NP + 1):
            ph = math.pi * j / NP                 # よこの はし（-x）から はし（+x）
            r = 0.3 * math.sin(ph) * k
            row.append(ball.bm.verts.new(P(0.28 * math.cos(ph), 0.3 + r * math.sin(th), r * math.cos(th))))
        rows.append((row, 1 - f))
    for i in range(NT):
        (ra, va), (rb, vb) = rows[i], rows[i + 1]
        if vb > va + 0.5:
            vb -= 1
        for j in range(NP):
            quad = [ra[j], rb[j], rb[j + 1], ra[j + 1]]
            uvs = [(j / NP, va), (j / NP, vb), ((j + 1) / NP, vb), ((j + 1) / NP, va)]
            if j == 0 or j == NP - 1:             # はしは 1てんに あつまるので さんかく
                quad = [q for n, q in enumerate(quad) if n != (1 if j == 0 else 2)]
                uvs = [q for n, q in enumerate(uvs) if n != (1 if j == 0 else 2)]
            try:
                face = ball.bm.faces.new(quad)
            except ValueError:
                continue
            for loop, uv in zip(face.loops, uvs):
                loop[ball.uvl].uv = uv
    bmesh.ops.remove_doubles(ball.bm, verts=ball.bm.verts, dist=1e-5)   # はしの 1てん・つなぎめを くっつける
    mesh_obj('ball', ball.bm, shell, root)


# ---------- ようちゅう ----------

def larva_texture():
    """クリームいろの ひふ。おしりは つちが すけて はいいろ。ふしの しわと、ちゃいろい みじかい け"""
    W, H = 256, 512
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    cream = np.array([0.88, 0.81, 0.64])
    gray = np.array([0.42, 0.4, 0.35])
    t = smoothstep(0.12, 0.27, Vv)[..., None]
    col = (gray * (1 - t) + cream * t) * noise_col(W, H, 12, 0.18)
    fold = (np.abs(np.sin(Vv * 11 * math.pi)) ** 30)[..., None]
    col *= 1 - 0.18 * fold
    hair = rng.random((H, W)) > 0.994
    col[hair] = col[hair] * 0.4 + np.array([0.5, 0.34, 0.18]) * 0.6
    return image('larva_skin', col)


def build_larva(root):
    skin = material('larva_skin', img=larva_texture(), rough=0.5, coat=0.25)
    headm = material('larva_head', (0.66, 0.36, 0.12), rough=0.3, coat=0.9)
    dark = material('jaw', (0.08, 0.045, 0.03), rough=0.3, coat=0.8)
    spot = material('spiracle', (0.62, 0.34, 0.14), rough=0.5)
    body = empty('body', (0, 0, 0), root)
    # C のかたちの からだ（おしりが ふとい）。アプリの つくりかたと おなじ おおきさ
    R, A = 0.3, math.pi * 1.42
    at = lambda u: np.array([math.cos(u * A) * R, 0.13, -math.sin(u * A) * R])
    radius = lambda u: 0.155 - u * 0.06 if u < 0.22 else 0.142 - (u - 0.22) * 0.04
    n = 120
    path, rs = [], []
    for i in range(n + 1):
        u = i / n
        crease = 1 - 0.07 * abs(math.sin(u * 11 * math.pi)) ** 12 - 0.02 * abs(math.sin(u * 33 * math.pi)) ** 10 * (u > 0.22)
        tip = math.sqrt(math.sin(min(1, u / 0.05) * math.pi / 2))
        path.append(at(u))
        rs.append(radius(u) * crease * max(0.02, tip))
    b = Builder()
    b.tube(path, rs, ring=28)
    mesh_obj('skin', b.bm, skin, body)
    sp = Builder()
    for i in range(1, 10):
        u = i / 11
        out = np.array([math.cos(u * A), 0, -math.sin(u * A)])
        q = at(u) + out * radius(u) * 0.93 + np.array([0, 0.045, 0])
        sp.blob(tuple(q), (0.005, 0.016, 0.011), deform=lambda uu, pp, a=u * A: rot_y(pp, a), seg=8)
    mesh_obj('spiracles', sp.bm, spot, body)
    # あたま・おおあご・みじかい しょっかく・ちいさな あし 6ぽん
    ha = A + 0.28
    hc = np.array([math.cos(ha) * R, 0.13, -math.sin(ha) * R])
    fwd = np.array([-math.sin(ha), 0, -math.cos(ha)])
    side = np.array([math.cos(ha), 0, -math.sin(ha)])
    h = Builder()
    h.blob(tuple(hc), (0.11, 0.1, 0.09), e=0.95, deform=lambda u, p: rot_y(p, ha), seg=28)
    for s in (-1, 1):
        a0 = hc + fwd * 0.06 + side * s * 0.075 + np.array([0, 0.01, 0])
        h.taper([a0, a0 + fwd * 0.03 + side * s * 0.02, a0 + fwd * 0.05 + side * s * 0.015 - np.array([0, 0.03, 0])], 0.011, 0.005, n=8, ring=6)
    mesh_obj('head_shell', h.bm, headm, body)
    j = Builder()
    for s in (-1, 1):
        q = hc + fwd * 0.07 + side * s * 0.04 - np.array([0, 0.03, 0])
        j.taper([q, q + fwd * 0.03 - side * s * 0.005 - np.array([0, 0.01, 0]), q + fwd * 0.05 - side * s * 0.03 - np.array([0, 0.025, 0])], 0.022, 0.004, n=10, ring=8)
    mesh_obj('mandibles', j.bm, dark, body)
    lg = Builder()
    for u in (0.86, 0.91, 0.96):
        inward = np.array([-math.cos(u * A), 0, math.sin(u * A)])
        base = at(u) + inward * radius(u) * 0.7
        for dy in (-0.06, 0.06):
            p0 = base + np.array([0, dy * 0.6, 0])
            p1 = base + inward * 0.045 + np.array([0, dy * 1.05, 0])
            p2 = base + inward * 0.08 + np.array([0, dy * 0.95 - 0.03, 0])
            lg.taper([p0, p1, p2], 0.014, 0.005, n=10, ring=8)
    mesh_obj('legs', lg.bm, headm, body)


# ---------- さなぎ ----------

def pupa_texture():
    """あめいろの かわ。はらの ふしの さかいめは こい いろ"""
    W = H = 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    base = np.array([0.66, 0.37, 0.14])
    hi = np.array([0.84, 0.56, 0.26])
    k = smoothstep(0.95, 0.15, np.abs(U - 0.5) * 2)[..., None]
    col = (base * (1 - k) + hi * k) * noise_col(W, H, 10, 0.2)
    f = (Vv * 6) % 1
    line = smoothstep(0.08, 0.0, np.minimum(f, 1 - f))[..., None] * 0.45
    col = col * (1 - line) + np.array([0.4, 0.2, 0.07]) * line
    return image('pupa_skin', col)


def build_pupa(root):
    tex = material('pupa_abdomen', img=pupa_texture(), rough=0.3, coat=0.8)
    skin = material('pupa_skin', (0.74, 0.45, 0.18), rough=0.3, coat=0.8)
    fold = material('pupa_fold', (0.6, 0.33, 0.13), rough=0.35, coat=0.6)
    room = material('pupa_room', (0.16, 0.09, 0.05), rough=0.95)
    r = Builder()
    r.blob((0, 0.006, 0), (0.34, 0.004, 0.6), seg=28)
    mesh_obj('room', r.bm, room, root)
    # おなか：6つの ふし、おしりに むかって ほそく なる
    def abd(u, p):
        t = 1 - 0.45 * max(0.0, -u[2]) ** 1.6
        f = ((1 - u[2]) / 2 * 6) % 1
        k = t * (1 - 0.05 * (abs(f - 0.5) * 2) ** 3)
        p[0] *= k
        p[1] *= k
        if u[1] < 0:
            p[1] *= 0.75
        return p
    b = Builder()
    b.blob((0, 0.13, -0.2), (0.2, 0.15, 0.27), deform=abd, seg=48)
    mesh_obj('abdomen', b.bm, tex, root)
    b = Builder()
    b.blob((0, 0.15, 0.1), (0.21, 0.16, 0.19), e=0.95, seg=36)
    b.blob((0, 0.14, 0.3), (0.12, 0.1, 0.1), seg=24)
    b.taper([(0, 0.1, -0.44), (0, 0.095, -0.49)], 0.02, 0.004, n=4, ring=6)
    mesh_obj('pupa_body', b.bm, skin, root)
    f = Builder()
    for s in (-1, 1):
        f.blob((s * 0.17, 0.12, 0.0), (0.05, 0.085, 0.21), deform=lambda u, p, s=s: rot_y(p, s * 0.15), seg=24)   # たたまれた はね
        f.blob((s * 0.1, 0.17, 0.33), (0.025, 0.03, 0.03), seg=10)                                               # め
        for z0, z1 in ((0.22, 0.05), (0.17, -0.02), (0.12, -0.1)):                                               # たたまれた あし
            f.taper([(s * 0.09, 0.03, z0), (s * 0.1, 0.03, (z0 + z1) / 2), (s * 0.05, 0.03, z1)], 0.02, 0.012, n=8, ring=8)
    mesh_obj('pupa_fold', f.bm, fold, root)
    hb = Builder()
    hb.taper([(0, 0.17, 0.36), (0, 0.19, 0.46), (0, 0.23, 0.53), (0, 0.29, 0.57)], 0.035, 0.018, n=16)
    mesh_obj('pupa_horn', hb.bm, fold, root)
    jb = Builder()
    for s in (-1, 1):
        jb.taper([(s * 0.05, 0.12, 0.36), (s * 0.07, 0.12, 0.46), (s * 0.03, 0.12, 0.54)], 0.035, 0.012, n=10)
    mesh_obj('pupa_jaws', jb.bm, fold, root)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = empty('bug', (0, 0, 0))
    other = {'ant': build_ant, 'dango': build_dango, 'larva': build_larva, 'pupa': build_pupa}.get(SP['kind'])
    if other:
        other(root)
        export()
        return
    shell = material('shell', img=shell_texture(), rough=SP['rough'], metal=SP.get('metal', 0.0), coat=SP['coat'])
    legm = material('leg', SP['leg'], rough=0.3, coat=0.8)
    jawc = tuple(SP['light'][i] * 0.55 + SP['dark'][i] * 0.45 for i in range(3))
    dark = material('horn', jawc if SP['kind'] == 'kuwa' else (0.16, 0.06, 0.03), rough=0.28, coat=1.0)
    under = material('under', (0.1, 0.06, 0.045), rough=0.5)
    eye = material('eye', (0.02, 0.02, 0.02), rough=0.05, coat=1.0)
    front = material('shell_front', img=shell_texture(front=True), rough=SP['rough'], metal=SP.get('metal', 0.0), coat=SP['coat'])
    (build_kabuto if SP['kind'] == 'kabuto' else build_kuwa)(root, shell, legm, dark, under, eye, front)
    export()


def export():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
    print('EXPORTED', OUT, os.path.getsize(OUT))


main()
