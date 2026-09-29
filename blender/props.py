# すいそうの なかの もの（みずくさ・おきもの・きぐ）を Blender で つくって models/prop_*.glb に かきだす。
#   つかいかた（math-app フォルダで）:
#     "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python blender/props.py -- vallis
#     なまえ：vallis・sword・cabomba（みずくさ）、rocks・driftwood・shells・castle・ship（おきもの）、
#             filter・heater・airpump・airstone（きぐ）
#   ふつうは node blender/build.mjs で ぜんぶ つくる
#
# アプリ（three.js）での きまり：
#   ・y が うえ。みずくさは たかさ 1（アプリで すいそうの ふかさに あわせて のばす）、ほかは cm
#   ・みずくさは ねもとが y=0。アプリで ゆらゆら させる
#   ・filter：ガラスの めんが z=0、ふちの たかさが y=0。z が マイナスは すいそうの そと
#     intake（すいこみ パイプ）は ながさ 1（アプリで のばす）、strainer は その したに つける
#   ・heater：した が y=0。glass（すける）・led（ひかる）
#   ・なまえで アプリが あつかいを かえる：glass・led・leaf（うすい はっぱ：ぬきで かく）

import math
import os
import sys

import bmesh
import bpy
import numpy as np

NAME = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'vallis'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'models', f'prop_{NAME}.raw.glb')
rng = np.random.default_rng(sum(map(ord, NAME)) * 97 + 3)


def P(x, y, z):
    """アプリの ざひょう（x よこ・y うえ・z まえ）→ Blender の ざひょう"""
    return (x, -z, y)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def norm(v):
    v = np.asarray(v, dtype=float)
    return v / (np.linalg.norm(v) + 1e-9)


# ---------- がぞう ----------

def value_noise(W, H, cells):
    """くりかえしても つなぎめの ない なめらかな ノイズ（0〜1）"""
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
    a = g[y0][:, x0]
    b = g[y0][:, x1]
    c = g[y1][:, x0]
    d = g[y1][:, x1]
    top = a * (1 - tx) + b * tx
    bot = c * (1 - tx) + d * tx
    return top * (1 - ty[:, None]) + bot * ty[:, None]


def fbm(W, H, base=4, octaves=5):
    out = np.zeros((H, W))
    amp = 1.0
    total = 0
    for o in range(octaves):
        out += value_noise(W, H, base * 2 ** o) * amp
        total += amp
        amp *= 0.5
    return out / total


def rgb(*c):
    return np.array(c, dtype=float)


def mix(a, b, k):
    return a * (1 - k[..., None]) + b * k[..., None]


def image(name, col, alpha=None):
    h, w, _ = col.shape
    a = np.ones((h, w)) if alpha is None else alpha
    arr = np.concatenate([np.clip(col, 0, 1), np.clip(a, 0, 1)[..., None]], axis=2)
    # 8bit の がぞうは いれた かずが そのまま（みための いろ）で ほぞん される
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.pack()
    return img


def material(name, img=None, color=(1, 1, 1), rough=0.6, metal=0.0, alpha=False, emit=None):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in color]
    b.inputs['Base Color'].default_value = (*lin, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if img:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 2.0
    if alpha:
        if hasattr(m, 'surface_render_method'):
            m.surface_render_method = 'BLENDED'
        if hasattr(m, 'blend_method'):
            m.blend_method = 'BLEND'
    m.use_backface_culling = False
    return m


def obj(name, bm, mat, smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # めんの おもて・うらを そろえる
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------- かたちの どうぐ ----------

def grid(bm, uvl, rows, uvs, closed=False):
    """てんの ならび（rows × cols）から めんを はる"""
    vs = [[bm.verts.new(P(*p)) for p in row] for row in rows]
    nr = len(rows)
    nc = len(rows[0])
    for i in range(nr - 1):
        for j in range(nc - (0 if closed else 1)):
            j1 = (j + 1) % nc
            f = bm.faces.new((vs[i][j], vs[i][j1], vs[i + 1][j1], vs[i + 1][j]))
            uj1 = uvs[i][j + 1] if (closed and j + 1 == nc) else uvs[i][j1]
            uj1b = uvs[i + 1][j + 1] if (closed and j + 1 == nc) else uvs[i + 1][j1]
            for loop, uv in zip(f.loops, [uvs[i][j], uj1, uj1b, uvs[i + 1][j]]):
                loop[uvl].uv = uv
    return vs


def tube(bm, uvl, path, radii, ring=10, vscale=1.0, cap=True, wobble=0.0):
    """path に そった つつ。uv は u＝まわり、v＝ながさ"""
    path = [np.asarray(p, dtype=float) for p in path]
    n = len(path)
    tans = [norm(path[min(i + 1, n - 1)] - path[max(i - 1, 0)]) for i in range(n)]
    ref = np.array([0, 1, 0]) if abs(tans[0][1]) < 0.9 else np.array([1, 0, 0])
    nrm = norm(np.cross(np.cross(tans[0], ref), tans[0]))
    rows, uvs = [], []
    length = 0
    for i in range(n):
        if i:
            nrm = norm(nrm - np.dot(nrm, tans[i]) * tans[i])
            length += np.linalg.norm(path[i] - path[i - 1])
        bin_ = np.cross(tans[i], nrm)
        row, urow = [], []
        for j in range(ring + 1):
            a = 2 * math.pi * j / ring
            r = radii[i] * (1 + wobble * math.sin(a * 3 + i * 0.7))
            row.append(path[i] + (math.cos(a) * nrm + math.sin(a) * bin_) * r)
            urow.append((j / ring, length * vscale))
        rows.append(row)
        uvs.append(urow)
    # さいごの れつは さいしょと おなじ いち（あとで くっつける。uv は べつべつ）
    vs = grid(bm, uvl, rows, uvs)
    if cap:
        for end, k in ((0, 0), (n - 1, n - 1)):
            c = bm.verts.new(P(*path[k]))
            ring_vs = vs[k][:-1]
            for j in range(ring):
                a, b = ring_vs[j], ring_vs[(j + 1) % ring]
                try:
                    f = bm.faces.new((a, b, c) if end else (b, a, c))
                    for loop in f.loops:
                        loop[uvl].uv = (0.5, 0.0)
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=[v for row in vs for v in row], dist=1e-6)
    return vs


def box(bm, uvl, center, size, uv_scale=1.0, bevel=0.0):
    """はこ。uv は めんごとに cm で（レンガや いたの もようが のびない）"""
    cx, cy, cz = center
    sx, sy, sz = [s / 2 for s in size]
    faces = [
        ((1, 0, 0), (0, 0, -1), (0, 1, 0)), ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),
        ((0, 1, 0), (1, 0, 0), (0, 0, -1)), ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
        ((0, 0, 1), (1, 0, 0), (0, 1, 0)), ((0, 0, -1), (-1, 0, 0), (0, 1, 0)),
    ]
    half = np.array([sx, sy, sz])
    for n, u, v in faces:
        n, u, v = np.array(n), np.array(u), np.array(v)
        c = np.array(center) + n * half
        du = u * np.abs(np.dot(u, half))
        dv = v * np.abs(np.dot(v, half))
        pts = [c - du - dv, c + du - dv, c + du + dv, c - du + dv]
        f = bm.faces.new([bm.verts.new(P(*p)) for p in pts])
        for loop, p in zip(f.loops, pts):
            loop[uvl].uv = (np.dot(p, u) * uv_scale, np.dot(p, v) * uv_scale)


def cylinder(bm, uvl, base, height, r_bottom, r_top=None, seg=20, uv_scale=1.0, cap=True):
    r_top = r_bottom if r_top is None else r_top
    rows, uvs = [], []
    for k, (y, r) in enumerate(((0, r_bottom), (height, r_top))):
        row, urow = [], []
        for j in range(seg + 1):
            a = 2 * math.pi * j / seg
            row.append((base[0] + math.cos(a) * r, base[1] + y, base[2] + math.sin(a) * r))
            urow.append((a * max(r_bottom, 0.01) * uv_scale, y * uv_scale))
        rows.append(row)
        uvs.append(urow)
    vs = grid(bm, uvl, rows, uvs)
    if cap:
        for k, y in ((1, height),):
            c = bm.verts.new(P(base[0], base[1] + y, base[2]))
            for j in range(seg):
                f = bm.faces.new((vs[k][j], vs[k][j + 1], c))
                for loop in f.loops:
                    loop[uvl].uv = (0, 0)
    return vs


def displaced_blob(bm, uvl, center, size, seed, rough=0.25, flat=-0.3, subdiv=3):
    """ごつごつ した いし"""
    r = np.random.default_rng(seed)
    waves = [(norm(r.normal(size=3)), r.random() * 6, 1.2 + r.random() * 2.5, 0.5 ** k) for k in range(9)]
    geom = bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1)
    for v in geom['verts']:
        p = np.array([v.co.x, v.co.z, -v.co.y])  # Blender → アプリ の むき
        n = sum(a * math.sin(np.dot(d, p) * f * 2 + ph) for d, ph, f, a in waves)
        ridge = sum(a * abs(math.sin(np.dot(d, p) * f * 4 + ph)) for d, ph, f, a in waves[:4])
        q = p * (1 + rough * n * 0.6 - rough * 0.25 * ridge)
        if q[1] < flat:
            q[1] = flat + (q[1] - flat) * 0.15
        q = q * np.array(size) + np.array(center)
        v.co = P(*q)
    for f in geom['faces'] if 'faces' in geom else []:
        pass
    return geom


def sphere_uv(bm, uvl, verts, center):
    for f in bm.faces:
        for loop in f.loops:
            co = loop.vert.co
            p = np.array([co.x, co.z, -co.y]) - np.array(center)
            loop[uvl].uv = (math.atan2(p[2], p[0]) / (2 * math.pi) + 0.5, p[1] * 0.25)


# ---------- みずくさ ----------

def leaf_texture(kind):
    W, H = 128, 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    n = fbm(W, H, 4, 4)
    if kind == 'vallis':
        base = mix(rgb(0.16, 0.34, 0.1), rgb(0.46, 0.72, 0.26), smoothstep(0.0, 1.0, Vv))
        veins = smoothstep(0.06, 0.0, np.abs((U * 5) % 1 - 0.5) - 0.44)
        col = base * (1 + 0.18 * veins[..., None]) * (0.9 + 0.2 * n[..., None])
        tipburn = smoothstep(0.93, 1.0, Vv) * 0.5
        col = mix(col, rgb(0.45, 0.38, 0.15), tipburn)
    elif kind == 'sword':
        base = mix(rgb(0.14, 0.36, 0.1), rgb(0.3, 0.58, 0.18), smoothstep(0.1, 0.9, Vv))
        mid = smoothstep(0.035, 0.0, np.abs(U - 0.5))
        lateral = smoothstep(0.05, 0.0, np.abs(((Vv * 7) - np.abs(U - 0.5) * 3) % 1 - 0.5) - 0.45) * smoothstep(0.02, 0.1, np.abs(U - 0.5))
        col = base * (1 + 0.35 * mid[..., None] + 0.15 * lateral[..., None]) * (0.9 + 0.2 * n[..., None])
        col = mix(col, col * 0.8, smoothstep(0.42, 0.5, np.abs(U - 0.5)))
    else:  # cabomba：こまかく わかれた おうぎがたの はっぱ（ぬきで かく）
        ang = U
        rad = Vv
        seg = np.abs(((ang * 7) % 1) - 0.5)
        fork = np.abs(((ang * 14) % 1) - 0.5)
        thread = smoothstep(0.36, 0.2, seg) * (rad < 0.5) + smoothstep(0.36, 0.2, fork) * (rad >= 0.5)
        col = mix(rgb(0.2, 0.46, 0.14), rgb(0.42, 0.72, 0.28), rad) * (0.9 + 0.2 * n[..., None])
        alpha = np.clip(thread * smoothstep(1.0, 0.92, rad) + (rad < 0.12), 0, 1)
        return image(f'{kind}_leaf', col, alpha)
    return image(f'{kind}_leaf', col)


def build_vallis():
    mat = material('leaf', leaf_texture('vallis'), rough=0.55)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for i in range(18):
        h = 0.5 + rng.random() * 0.5
        base = np.array([rng.normal() * 0.07, 0, rng.normal() * 0.05])
        lean = rng.random() * 2 * math.pi
        amt = 0.08 + rng.random() * 0.2
        ph = rng.random() * 6
        t0 = rng.random() * math.pi
        tw = (rng.random() - 0.5) * 2.6
        w = 0.028 + rng.random() * 0.016
        rows, uvs = [], []
        N = 20
        for j in range(N + 1):
            t = j / N
            off = np.array([math.cos(lean), 0, math.sin(lean)]) * amt * h * t ** 1.6
            off += np.array([-math.sin(lean), 0, math.cos(lean)]) * math.sin(t * math.pi * 1.3 + ph) * 0.03
            c = base + off + np.array([0, h * t, 0])
            a = t0 + tw * t
            d = np.array([math.cos(a), 0, math.sin(a)])
            nrm = np.array([-math.sin(a), 0, math.cos(a)])
            ww = w * (1 - t ** 5 * 0.95) * (0.55 + 0.45 * min(1, t * 6))
            rows.append([c - d * ww / 2, c + nrm * ww * 0.18, c + d * ww / 2])
            uvs.append([(0, t), (0.5, t), (1, t)])
        grid(bm, uvl, rows, uvs)
    return [obj('plant_leaf', bm, mat)]


def build_sword():
    mat = material('leaf', leaf_texture('sword'), rough=0.5)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    n = 12
    for i in range(n):
        ang = i / n * 2 * math.pi + rng.random() * 0.4
        tilt = 0.25 + rng.random() * 0.55
        L = 0.55 + rng.random() * 0.45
        pet = 0.28
        dh = np.array([math.cos(ang), 0, math.sin(ang)])
        side = np.array([-math.sin(ang), 0, math.cos(ang)])
        rows, uvs = [], []
        N = 22
        for j in range(N + 1):
            t = j / N
            c = dh * math.sin(tilt) * L * t + np.array([0, L * t * math.cos(tilt) - 0.28 * L * t * t * math.sin(tilt), 0])
            if t < pet:
                w = 0.012
            else:
                q = (t - pet) / (1 - pet)
                w = 0.12 * L * math.sin(math.pi * q ** 0.75) + 0.004
            fold = w * 0.25
            rows.append([c - side * w + np.array([0, -fold * 0.4, 0]), c - side * w * 0.5, c + np.array([0, fold, 0]), c + side * w * 0.5, c + side * w + np.array([0, -fold * 0.4, 0])])
            uvs.append([(0, t), (0.25, t), (0.5, t), (0.75, t), (1, t)])
        grid(bm, uvl, rows, uvs)
    return [obj('plant_leaf', bm, mat)]


def build_cabomba():
    leaf = material('leaf', leaf_texture('cabomba'), rough=0.5, alpha=True)
    stem = material('stem', color=(0.3, 0.52, 0.2), rough=0.6)
    bl = bmesh.new()
    ul = bl.loops.layers.uv.new('UVMap')
    bs = bmesh.new()
    us = bs.loops.layers.uv.new('UVMap')
    for s in range(7):
        base = np.array([rng.normal() * 0.06, 0, rng.normal() * 0.05])
        h = 0.6 + rng.random() * 0.4
        bend = norm([rng.normal(), 0, rng.normal()]) * 0.12
        pts = [base + bend * (t ** 2) * h + np.array([0, h * t, 0]) for t in np.linspace(0, 1, 12)]
        tube(bs, us, pts, [0.0045] * 12, ring=6, cap=False)
        k = 0
        for y in np.arange(0.05, h, 0.042):
            t = y / h
            c = base + bend * t ** 2 * h + np.array([0, y, 0])
            size = 0.075 * (1 - 0.4 * t) * (0.6 + 0.4 * min(1, t * 5))
            for m in range(3):
                a = m / 3 * 2 * math.pi + k * 0.6
                d = np.array([math.cos(a), 0.35, math.sin(a)])
                d = norm(d)
                side = norm(np.cross(d, [0, 1, 0]))
                rows, uvs = [], []
                for i in range(5):
                    q = i / 4
                    row, urow = [], []
                    for j in range(7):
                        u = j / 6
                        fa = (u - 0.5) * 2.4
                        pnt = c + (d * math.cos(fa) + side * math.sin(fa)) * size * q + np.array([0, 0.004 * q * q, 0])
                        row.append(pnt)
                        urow.append((u, q))
                    rows.append(row)
                    uvs.append(urow)
                grid(bl, ul, rows, uvs)
            k += 1
    return [obj('plant_leaf', bl, leaf), obj('plant_stem', bs, stem)]


# ---------- おきもの ----------

def rock_texture():
    W = H = 256
    n = fbm(W, H, 4, 6)
    n2 = fbm(W, H, 8, 4)
    col = mix(rgb(0.46, 0.44, 0.4), rgb(0.72, 0.68, 0.62), smoothstep(0.3, 0.75, n))
    crack = smoothstep(0.03, 0.0, np.abs(n2 - 0.5))
    col = col * (1 - 0.45 * crack[..., None])
    speck = (rng.random((H, W)) > 0.985)
    col[speck] = col[speck] * 0.5
    moss = smoothstep(0.62, 0.72, fbm(W, H, 3, 3)) * 0.35
    col = mix(col, rgb(0.3, 0.38, 0.2), moss)
    return image('rock', col)


def build_rocks():
    mat = material('rock', rock_texture(), rough=0.88)
    out = []
    for i, (c, s, sq) in enumerate([((0, 0, 0), 2.8, 0.75), ((3.1, 0, 1.0), 1.8, 0.8), ((-2.6, 0, 1.3), 1.4, 0.7), ((0.9, 0, 2.3), 0.9, 0.6), ((-1.4, 0, -1.6), 1.1, 0.9)]):
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.new('UVMap')
        displaced_blob(bm, uvl, (c[0], s * sq * 0.3, c[2]), (s * (1.1 + rng.random() * 0.3), s * sq, s), 11 + i * 7, rough=0.28)
        sphere_uv(bm, uvl, None, c)
        out.append(obj('rock', bm, mat))
    return out


def bark_texture():
    W, H = 128, 512
    n = fbm(W, H, 4, 5)
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    streak = np.sin((U * 18 + n * 3) * 2 * math.pi) * 0.5 + 0.5
    col = mix(rgb(0.34, 0.24, 0.15), rgb(0.62, 0.48, 0.33), smoothstep(0.25, 0.8, n * 0.6 + streak * 0.4))
    grooves = smoothstep(0.12, 0.0, streak) * 0.5
    col = col * (1 - grooves[..., None])
    return image('bark', col)


def build_driftwood():
    mat = material('bark', bark_texture(), rough=0.85)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    def jitter(pts, amp):
        return [np.array(p) + rng.normal(size=3) * amp * (0.3 + 0.7 * math.sin(math.pi * i / (len(pts) - 1))) for i, p in enumerate(pts)]
    def spline(ctrl, n=24):
        ctrl = [np.array(c, dtype=float) for c in ctrl]
        out = []
        for i in range(n + 1):
            t = i / n * (len(ctrl) - 1)
            k = min(int(t), len(ctrl) - 2)
            f = t - k
            p0 = ctrl[max(k - 1, 0)]
            p1, p2 = ctrl[k], ctrl[k + 1]
            p3 = ctrl[min(k + 2, len(ctrl) - 1)]
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3))
        return out
    trunk = spline(jitter([(-8, 0.7, 0.6), (-4, 1.0, 0.2), (0, 1.3, -0.3), (3.5, 1.9, 0.2), (7.0, 3.0, -0.4)], 0.3))
    tube(bm, uvl, trunk, [1.15 - 0.65 * (i / 24) ** 0.8 for i in range(25)], ring=12, vscale=0.12, wobble=0.12)
    branches = [
        ([trunk[8], (-3.0, 3.6, 1.2), (-5.2, 6.4, 1.6), (-6.0, 7.8, 1.0)], 0.55, 0.14),
        ([trunk[16], (4.6, 4.2, -1.8), (7.4, 5.6, -2.8)], 0.45, 0.12),
        ([trunk[2], (-9.8, 0.9, 2.4), (-11.6, 1.2, 3.8)], 0.5, 0.18),
        ([trunk[12], (1.8, 3.2, 2.2), (2.6, 5.0, 3.6)], 0.34, 0.1),
        ([trunk[20], (8.8, 3.2, 1.6), (10.6, 3.0, 2.8)], 0.3, 0.1),
    ]
    for ctrl, r0, r1 in branches:
        pts = spline(jitter(ctrl, 0.25), 16)
        tube(bm, uvl, pts, [r0 + (r1 - r0) * (i / 16) for i in range(17)], ring=10, vscale=0.12, wobble=0.1)
    return [obj('wood', bm, mat)]


def shell_texture(kind):
    W = H = 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    n = fbm(W, H, 4, 4)
    if kind == 'scallop':
        ribs = np.abs(np.sin(U * math.pi * 16))
        rings = np.abs(np.sin(Vv * math.pi * 14 + n * 2))
        col = mix(rgb(0.98, 0.9, 0.84), rgb(0.9, 0.52, 0.42), smoothstep(0.3, 0.9, rings) * 0.7)
        col = col * (0.82 + 0.18 * ribs[..., None])
    else:
        stripes = np.abs(np.sin((U * 3 + Vv * 18 + n * 0.8) * math.pi))
        col = mix(rgb(0.97, 0.92, 0.82), rgb(0.62, 0.38, 0.2), smoothstep(0.75, 0.95, stripes))
    return image(f'{kind}_shell', col)


def build_shells():
    out = []
    sm = material('shell', shell_texture('scallop'), rough=0.45)
    for k, (cx, cz, R, ry) in enumerate([(0, 0, 2.3, 0.3), (3.4, 1.8, 1.6, 2.1)]):
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.new('UVMap')
        rows, uvs = [], []
        NR, NT = 14, 40
        for i in range(NR + 1):
            r = i / NR
            row, urow = [], []
            for j in range(NT + 1):
                th = (j / NT - 0.5) * 2.4
                rib = 0.07 * R * abs(math.sin(th * 9)) ** 0.7 * r
                y = 0.42 * R * math.sin(math.pi * min(1, r * 0.95)) ** 0.7 * math.cos(th * 0.6) ** 2 + rib + 0.05
                x = R * r * math.sin(th)
                z = R * r * math.cos(th) - R * 0.5
                ca, sa = math.cos(ry), math.sin(ry)
                row.append((cx + x * ca - z * sa, y, cz + x * sa + z * ca))
                urow.append((j / NT, r))
            rows.append(row)
            uvs.append(urow)
        grid(bm, uvl, rows, uvs)
        out.append(obj('shell', bm, sm))
    # まきがい（らせんの つつ）
    cm = material('shell', shell_texture('conch'), rough=0.4)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    U_MAX = 7 * math.pi
    rows, uvs = [], []
    NU, NV = 90, 18
    for i in range(NU + 1):
        u = i / NU * U_MAX
        e = math.exp(0.17 * (u - U_MAX))
        R = 1.0 * e
        a = 0.78 * e
        row, urow = [], []
        for j in range(NV + 1):
            v = j / NV * 2 * math.pi
            x = (R + a * math.cos(v)) * math.cos(u)
            z = (R + a * math.cos(v)) * math.sin(u)
            y = -2.4 * e + a * math.sin(v)
            # よこに ねかせて おく
            row.append((-2.8 + y * 0.9, 0.75 + z * 0.9, 1.6 + x * 0.9))
            urow.append((i / NU * 4, j / NV))
        rows.append(row)
        uvs.append(urow)
    grid(bm, uvl, rows, uvs)
    out.append(obj('shell', bm, cm))
    return out


def brick_texture():
    W = H = 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    rows = 8
    row = np.floor(Vv * rows)
    bx = (U * 4 + 0.5 * (row % 2)) % 1
    by = (Vv * rows) % 1
    mortar = np.maximum(smoothstep(0.06, 0.02, np.minimum(bx, 1 - bx)), smoothstep(0.1, 0.04, np.minimum(by, 1 - by)))
    brick_id = np.floor(U * 4 + 0.5 * (row % 2)) + row * 7
    tone = (np.sin(brick_id * 12.9898) * 43758.5453) % 1
    n = fbm(W, H, 8, 4)
    col = mix(rgb(0.56, 0.52, 0.46), rgb(0.74, 0.7, 0.62), tone * 0.7 + n * 0.3)
    col = mix(col, rgb(0.32, 0.3, 0.27), mortar)
    moss = smoothstep(0.64, 0.75, fbm(W, H, 3, 3)) * 0.5
    return image('brick', mix(col, rgb(0.28, 0.4, 0.2), moss))


def roof_texture():
    W = H = 128
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    row = np.floor(Vv * 8)
    fx = (U * 12 + 0.5 * (row % 2)) % 1
    fy = (Vv * 8) % 1
    d = np.hypot(fx - 0.5, fy * 0.8)
    col = mix(rgb(0.72, 0.24, 0.16), rgb(0.42, 0.12, 0.08), smoothstep(0.35, 0.55, d))
    return image('roof', col)


def build_castle():
    stone = material('stone', brick_texture(), rough=0.9)
    roof = material('roof', roof_texture(), rough=0.6)
    dark = material('dark', color=(0.06, 0.05, 0.05), rough=1)
    flag = material('flag', color=(0.85, 0.15, 0.12), rough=0.7)
    base = material('rock', rock_texture(), rough=0.9)
    out = []
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    box(bm, uvl, (0, 3.2, 0), (6.4, 6.4, 4.6), uv_scale=0.22)
    for i in range(6):
        for z in (-2.1, 2.1):
            box(bm, uvl, (-2.8 + i * 1.12, 6.75, z), (0.62, 0.7, 0.42), uv_scale=0.22)
    for x, z in ((-3.4, -2.4), (3.4, -2.4), (-3.4, 2.4), (3.4, 2.4)):
        cylinder(bm, uvl, (x, 0, z), 8.4, 1.35, 1.25, seg=18, uv_scale=0.22)
        for k in range(8):
            a = k / 8 * 2 * math.pi
            box(bm, uvl, (x + math.cos(a) * 1.25, 8.75, z + math.sin(a) * 1.25), (0.45, 0.7, 0.45), uv_scale=0.22)
    out.append(obj('stone', bm, stone, smooth=False))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for x, z in ((-3.4, -2.4), (3.4, -2.4), (-3.4, 2.4), (3.4, 2.4)):
        cylinder(bm, uvl, (x, 9.0, z), 3.0, 1.7, 0.02, seg=18, uv_scale=0.3)
    out.append(obj('roof', bm, roof))
    # もん と まど（くらい あな）
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    def arch(cx, cy, cz, w, h, facing):
        pts = [(-w / 2, 0), (w / 2, 0), (w / 2, h - w / 2)]
        pts += [(math.cos(a) * w / 2, h - w / 2 + math.sin(a) * w / 2) for a in np.linspace(0, math.pi, 10)]
        pts += [(-w / 2, h - w / 2)]
        vs = []
        for px, py in pts:
            if facing == 'z':
                vs.append(bm.verts.new(P(cx + px, cy + py, cz)))
            else:
                vs.append(bm.verts.new(P(cx, cy + py, cz + px)))
        bm.faces.new(vs)
    arch(0, 0, 2.32, 2.0, 2.8, 'z')
    for x in (-1.8, 1.8):
        arch(x, 4.2, 2.32, 0.7, 1.2, 'z')
    for x, z in ((-3.4, 2.4), (3.4, 2.4)):
        arch(x, 5.6, z + 1.33, 0.55, 1.0, 'z')
    out.append(obj('dark', bm, dark, smooth=False))
    # はた
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for x, z in ((-3.4, -2.4), (3.4, 2.4)):
        cylinder(bm, uvl, (x, 11.8, z), 2.2, 0.06, seg=6)
        vs = [bm.verts.new(P(x, 13.9, z)), bm.verts.new(P(x + 1.6, 13.5, z + 0.15)), bm.verts.new(P(x, 13.0, z))]
        bm.faces.new(vs)
    out.append(obj('flag', bm, flag, smooth=False))
    # いわの だい
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    displaced_blob(bm, uvl, (0, -0.1, 0), (6.4, 0.7, 4.6), 5, rough=0.12, flat=-0.6, subdiv=3)
    sphere_uv(bm, uvl, None, (0, 0, 0))
    out.append(obj('rock', bm, base))
    return out


def plank_texture():
    W, H = 256, 256
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    n = fbm(W, H, 6, 5)
    row = np.floor(Vv * 10)
    grain = np.sin((U * 3 + n * 1.5 + row * 0.37) * math.pi * 10) * 0.5 + 0.5
    col = mix(rgb(0.42, 0.29, 0.18), rgb(0.64, 0.48, 0.32), grain * 0.6 + n * 0.4)
    seam = smoothstep(0.08, 0.0, np.minimum((Vv * 10) % 1, 1 - (Vv * 10) % 1))
    f = (U * 2 + row * 0.37) % 1
    butt = smoothstep(0.012, 0.0, np.minimum(f, 1 - f))
    col = col * (1 - 0.6 * np.maximum(seam, butt)[..., None])
    algae = smoothstep(0.55, 0.7, fbm(W, H, 3, 4)) * 0.6
    return image('plank', mix(col, rgb(0.2, 0.32, 0.14), algae))


def build_ship():
    wood = material('plank', plank_texture(), rough=0.85)
    dark = material('dark', color=(0.05, 0.04, 0.03), rough=1)
    out = []
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    N, M = 30, 16
    rows, uvs = [], []
    for i in range(N + 1):
        t = i / N
        z = -7 + 14 * t
        w = 2.0 * math.sin(math.pi * (0.12 + 0.84 * t)) ** 0.7
        depth = 1.6 * (0.55 + 0.45 * math.sin(math.pi * (0.05 + 0.9 * t)) ** 0.5)
        deck = 1.9 + 1.6 * (t - 0.4) ** 2
        row, urow = [], []
        for j in range(M + 1):
            ph = (j / M - 0.5) * math.pi
            x = w * math.sin(ph)
            y = deck - depth * math.cos(ph) ** 0.7
            row.append((x, y, z))
            urow.append((z * 0.08, (j / M) * 0.8))
        rows.append(row)
        uvs.append(urow)
    grid(bm, uvl, rows, uvs)
    box(bm, uvl, (0, 1.75, 0), (3.6, 0.2, 11.5), uv_scale=0.08)
    box(bm, uvl, (0, 3.1, -4.4), (3.4, 2.4, 3.2), uv_scale=0.08)
    mast = [np.array([0.2, 1.8, 1.2]) + np.array([0.35, 1, 0.05]) * s for s in np.linspace(0, 5.2, 8)]
    tube(bm, uvl, mast, [0.3] * 8, ring=8, vscale=0.1)
    beam = [np.array([-2.6, 0.7, 3.8]) + np.array([1, 0.12, 0.2]) * s for s in np.linspace(0, 5, 6)]
    tube(bm, uvl, beam, [0.16] * 6, ring=6, vscale=0.1)
    out.append(obj('wood', bm, wood))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for z in (-3, -1, 1, 3):
        for side in (1, -1):
            t = (z + 7) / 14
            w = 2.0 * math.sin(math.pi * (0.12 + 0.84 * t)) ** 0.7
            geom = bmesh.ops.create_circle(bm, cap_ends=True, segments=10, radius=0.32)
            for v in geom['verts']:
                lx, ly = v.co.x, v.co.y
                v.co = P(side * (w * 0.93 + 0.08), 1.25 + ly, z + lx)
    # こわれた あな
    geom = bmesh.ops.create_circle(bm, cap_ends=True, segments=9, radius=0.9)
    for k, v in enumerate(geom['verts']):
        rr = 1 + 0.35 * math.sin(k * 2.3)
        v.co = P(2.25, 0.9 + v.co.y * rr * 0.6, 2.6 + v.co.x * rr)
    out.append(obj('dark', bm, dark, smooth=False))
    return out


# ---------- きぐ ----------

def plastic_texture(c1, c2, stripes=False):
    W = H = 128
    U, Vv = np.meshgrid((np.arange(W) + 0.5) / W, (np.arange(H) + 0.5) / H)
    n = fbm(W, H, 16, 3)
    col = mix(rgb(*c1), rgb(*c2), n * 0.35)
    if stripes:
        col = col * (1 - 0.35 * smoothstep(0.1, 0.0, np.abs((Vv * 10) % 1 - 0.5) - 0.38)[..., None])
    return image('plastic', col)


def build_filter():
    body = material('plastic', plastic_texture((0.17, 0.18, 0.2), (0.24, 0.25, 0.28)), rough=0.45)
    lid = material('plastic_lid', plastic_texture((0.3, 0.32, 0.35), (0.36, 0.38, 0.42), stripes=True), rough=0.4)
    pipe = material('pipe', color=(0.32, 0.36, 0.38), rough=0.35)
    dark = material('dark', color=(0.04, 0.04, 0.05), rough=0.9)
    out = []
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    box(bm, uvl, (0, -4.6, -4.2), (10, 13, 6.2), uv_scale=0.1)       # ほんたい（すいそうの うしろ）
    box(bm, uvl, (0, 0.8, -0.3), (6.4, 0.5, 4.6), uv_scale=0.1)      # ガラスに かける ところ
    box(bm, uvl, (0.8, 0.35, 1.6), (6.0, 0.35, 2.6), uv_scale=0.1)   # みずが でる ところ
    box(bm, uvl, (0.8, 0.6, 2.85), (6.0, 0.8, 0.3), uv_scale=0.1)
    out.append(obj('body', bm, body, smooth=False))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    box(bm, uvl, (0, 2.3, -4.2), (10.6, 0.7, 6.8), uv_scale=0.1)
    box(bm, uvl, (0, 2.75, -4.2), (8.6, 0.25, 5.2), uv_scale=0.1)
    out.append(obj('lid', bm, lid, smooth=False))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    tube(bm, uvl, [(-3, -1.6, -4.5), (-3, 1.4, -4.5), (-3, 1.9, -3.2), (-3, 1.4, 1.5), (-3, 0, 1.5)], [0.7] * 5, ring=12)
    out.append(obj('pipe', bm, pipe))
    # すいこみ パイプ（ながさ 1。アプリで のばす）と ストレーナー
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cylinder(bm, uvl, (-3, -1, 1.5), 1, 0.62, seg=14, cap=False)
    out.append(obj('intake', bm, material('intake', color=(0.32, 0.36, 0.38), rough=0.35)))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cylinder(bm, uvl, (-3, -3.2, 1.5), 3.2, 0.95, seg=16)
    for k in range(10):
        box(bm, uvl, (-3, -0.3 - k * 0.3, 1.5), (2.0, 0.08, 2.0), uv_scale=0.1)
    out.append(obj('strainer', bm, dark, smooth=False))
    return out


def build_heater():
    glass = material('glass', color=(0.9, 0.96, 1.0), rough=0.05)
    core = material('core', color=(0.85, 0.83, 0.78), rough=0.6)
    coil = material('coil', color=(0.75, 0.38, 0.12), rough=0.35, metal=0.8, emit=(0.9, 0.25, 0.02))
    cap = material('cap', color=(0.08, 0.08, 0.09), rough=0.4)
    led = material('led', color=(1.0, 0.45, 0.1), emit=(1.0, 0.4, 0.05))
    cup = material('glass_cup', color=(0.85, 0.92, 0.95), rough=0.2)
    out = []
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    prof = [(0.02, 0)] + [(0.9 * math.sin(a), 0.9 - 0.9 * math.cos(a)) for a in np.linspace(0.2, math.pi / 2, 6)] + [(0.9, 20)]
    rows, uvs = [], []
    for r, y in prof:
        rows.append([(math.cos(a) * r, y, math.sin(a) * r) for a in np.linspace(0, 2 * math.pi, 21)])
        uvs.append([(j / 20, y / 20) for j in range(21)])
    grid(bm, uvl, rows, uvs)
    out.append(obj('glass', bm, glass))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cylinder(bm, uvl, (0, 1.2, 0), 16.5, 0.42, seg=14)
    out.append(obj('core', bm, core))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    helix = [(math.cos(t) * 0.55, 2 + t * 0.075, math.sin(t) * 0.55) for t in np.linspace(0, 2 * math.pi * 24, 400)]
    tube(bm, uvl, helix, [0.06] * len(helix), ring=5)
    out.append(obj('coil', bm, coil))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cylinder(bm, uvl, (0, 19.6, 0), 3.4, 1.05, 1.0, seg=20)
    for k in range(5):
        cylinder(bm, uvl, (0, 20.2 + k * 0.5, 0), 0.18, 1.1, seg=20)
    cylinder(bm, uvl, (0, 23.0, 0), 0.8, 0.55, seg=12)
    tube(bm, uvl, [(0, 23.6, 0), (0, 25, -0.5), (0, 26.5, -2.5), (0, 27, -5)], [0.22] * 4, ring=8)
    out.append(obj('cap', bm, cap))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    geom = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.22)
    for v in geom['verts']:
        v.co = P(v.co.x, 21.8 + v.co.z, 1.0 - v.co.y)
    out.append(obj('led', bm, led))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for y in (5, 15):
        cylinder(bm, uvl, (0, y - 0.6, -1.0), 1.2, 0.95, seg=12)
        tube(bm, uvl, [(0, y, -1.2), (0, y, -2.2)], [0.7, 0.95], ring=14)
    out.append(obj('glass_cup', bm, cup))
    return out


def build_airpump():
    body = material('plastic', plastic_texture((0.24, 0.45, 0.68), (0.3, 0.52, 0.76)), rough=0.4)
    top = material('plastic_lid', plastic_texture((0.9, 0.9, 0.88), (0.96, 0.96, 0.94), stripes=True), rough=0.45)
    dark = material('dark', color=(0.08, 0.08, 0.09), rough=0.8)
    out = []
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    box(bm, uvl, (0, 1.5, 0), (8, 2.6, 4.6), uv_scale=0.1)
    out.append(obj('body', bm, body, smooth=False))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    box(bm, uvl, (0, 3.05, 0), (7.6, 0.5, 4.2), uv_scale=0.1)
    out.append(obj('lid', bm, top, smooth=False))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for x in (-3.2, 3.2):
        for z in (-1.6, 1.6):
            cylinder(bm, uvl, (x, 0, z), 0.25, 0.45, seg=10)
    cylinder(bm, uvl, (-3.2, 1.2, 2.3), 0.9, 0.22, seg=8)
    out.append(obj('feet', bm, dark))
    return out


def build_airstone():
    W = H = 128
    n = fbm(W, H, 16, 3)
    col = mix(rgb(0.52, 0.56, 0.6), rgb(0.72, 0.76, 0.8), n)
    holes = rng.random((H, W)) > 0.93
    col[holes] = col[holes] * 0.45
    mat = material('stone', image('airstone', col), rough=0.95)
    tipm = material('dark', color=(0.2, 0.22, 0.24), rough=0.5)
    out = []
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cylinder(bm, uvl, (0, 0, 0), 2.2, 1.1, 1.0, seg=18, uv_scale=0.3)
    out.append(obj('stone', bm, mat))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cylinder(bm, uvl, (0, 2.2, 0), 0.6, 0.35, 0.25, seg=10)
    out.append(obj('tip', bm, tipm))
    return out


BUILDERS = {
    'vallis': build_vallis, 'sword': build_sword, 'cabomba': build_cabomba,
    'rocks': build_rocks, 'driftwood': build_driftwood, 'shells': build_shells, 'castle': build_castle, 'ship': build_ship,
    'filter': build_filter, 'heater': build_heater, 'airpump': build_airpump, 'airstone': build_airstone,
}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    BUILDERS[NAME]()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
    print('EXPORTED', OUT, os.path.getsize(OUT))


main()
