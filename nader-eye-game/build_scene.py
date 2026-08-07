#!/usr/bin/env python3
"""
build_scene.py — عين نادر / Nader's Eye

بياخد بروبات مصدّرة من Canva بحجم الشاشة الكامل وخلفية شفافة،
وبيطلّع منها:
  1. صور مقصوصة ومضغوطة WebP  (حجم أصغر بكتير)
  2. ملف Scene Spec JSON فيه إحداثيات كل بروب

الاستخدام:
    python3 build_scene.py ./ch1_s01_props  --scene ch1_s01_livingroom --bg bg/ch1_s01.png
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("محتاج Pillow:  pip install Pillow")


CANVAS_W = 1290
CANVAS_H = 2796
PLAY_TOP = 280       # تحت البار
PLAY_BOTTOM = 2461   # فوق الشريط
MIN_TAP = 120        # أقل منطقة نقر مسموحة (بكسل)


def clean_name(filename: str) -> str:
    """اسم الملف → id نضيف:  'award Frame.png' → 'award_frame'"""
    name = Path(filename).stem
    name = re.sub(r"[\s\-]+", "_", name.strip())
    name = re.sub(r"[^0-9A-Za-z_\u0600-\u06FF]", "", name)
    return name.lower() or "prop"


def guess_layer(y: int, h: int) -> str:
    """تخمين الطبقة من موقع البروب رأسيًا — يتعدّل بالإيد بعدين."""
    center = y + h / 2
    if center < PLAY_TOP + (PLAY_BOTTOM - PLAY_TOP) * 0.33:
        return "back"
    if center < PLAY_TOP + (PLAY_BOTTOM - PLAY_TOP) * 0.72:
        return "mid"
    return "front"


def process(path: Path, out_dir: Path, quality: int, verbose: bool) -> dict | None:
    img = Image.open(path)

    if img.mode != "RGBA":
        print(f"  ⚠️  {path.name}: مش RGBA — اتجاهل (لازم خلفية شفافة)")
        return None

    if (img.width, img.height) != (CANVAS_W, CANVAS_H):
        src_ratio = img.width / img.height
        dst_ratio = CANVAS_W / CANVAS_H
        if abs(src_ratio - dst_ratio) > 0.01:
            print(f"  ⚠️  {path.name}: نسبة {src_ratio:.3f} مختلفة عن {dst_ratio:.3f} — الموقع ممكن يزيح")
        img = img.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)

    bbox = img.getbbox()
    if bbox is None:
        print(f"  ⚠️  {path.name}: الصورة فاضية تمامًا — اتجاهل")
        return None

    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0

    cropped = img.crop(bbox)
    pid = clean_name(path.name)
    out_file = out_dir / f"{pid}.webp"
    cropped.save(out_file, "WEBP", quality=quality, method=6)

    # منطقة النقر: مش أصغر من MIN_TAP، ومتمركزة على البروب
    tap_w, tap_h = max(w, MIN_TAP), max(h, MIN_TAP)
    tap_x = int(x0 - (tap_w - w) / 2)
    tap_y = int(y0 - (tap_h - h) / 2)

    saved = path.stat().st_size / max(out_file.stat().st_size, 1)
    if verbose:
        print(f"  ✅ {pid:<20} x={x0:<5} y={y0:<5} {w}x{h}   ×{saved:.0f} أصغر")

    return {
        "id": pid,
        "image": f"props/{pid}.webp",
        "x": x0,
        "y": y0,
        "w": w,
        "h": h,
        "rect": [tap_x, tap_y, tap_w, tap_h],
        "layer": guess_layer(y0, h),
        "type": "flavor",
        "requires": None,
        "yields": None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="مجلد البروبات المصدّرة بحجم الشاشة الكامل")
    ap.add_argument("--scene", required=True, help="مثال: ch1_s01_livingroom")
    ap.add_argument("--bg", default="", help="مسار الخلفية")
    ap.add_argument("--out", default="build", help="مجلد الإخراج")
    ap.add_argument("--quality", type=int, default=88)
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    src = Path(args.folder)
    if not src.is_dir():
        sys.exit(f"المجلد مش موجود: {src}")

    out_dir = Path(args.out)
    props_dir = out_dir / "props"
    props_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(
        f for f in src.iterdir()
        if f.suffix.lower() == ".png" and not f.name.startswith("._")
    )
    if not files:
        sys.exit("مفيش ملفات PNG في المجلد ده")

    print(f"\n🔍 بقرا {len(files)} بروب من {src}\n")

    hotspots = [p for f in files if (p := process(f, props_dir, args.quality, not args.quiet))]

    # الأقرب للكاميرا يترسم فوق
    hotspots.sort(key=lambda p: p["y"] + p["h"])

    spec = {
        "scene_id": args.scene,
        "canvas": [CANVAS_W, CANVAS_H],
        "play_area": [0, PLAY_TOP, CANVAS_W, PLAY_BOTTOM - PLAY_TOP],
        "background": args.bg,
        "character": "nader",
        "objectives": [],
        "hotspots": hotspots,
        "exits": [],
    }

    spec_file = out_dir / f"{args.scene}.json"
    spec_file.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n📄 {spec_file}")
    print(f"🖼️  {len(hotspots)} بروب في {props_dir}")
    print("\nالخطوة اللي بإيدك: افتح الـ JSON وغيّر type و yields و requires لكل بروب.\n")


if __name__ == "__main__":
    main()
