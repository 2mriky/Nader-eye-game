# عين نادر · Nader's Eye — Vertical Slice

## تشغيل محلي
    cd game
    python3 -m http.server 8000
ثم افتح http://localhost:8000  (لازم سيرفر — الـ fetch مش بيشتغل من file://)

## على الفون
ارفع المجلد على GitHub (private) ووصّله بـ Cloudflare Pages أو Vercel.
افتح اللينك على الآيفون ← Share ← Add to Home Screen.

## تعديل المشاهد
كل حاجة في `data/*.json`. مفيش كود بيتغير.

| الحقل | يعني |
|---|---|
| `type` | `pickup` تتشال · `container` محتاجة أداة · `line` القرص · `flavor` كلام بس |
| `yields` | اسم الحاجة اللي بتدخل الشنطة |
| `requires` | اسم الحاجة المطلوبة عشان تفتح |
| `rect` | منطقة النقر [x, y, w, h] |
| `objectives` | اللي بيظهر في الشريط تحت |

## أصول جديدة
    python3 build_scene.py "./hidden Objects/ch1_s01" --scene ch1_s01 --bg assets/bg/ch1_s01.webp

## تصفير الحفظ
اكتب في الكونسول: `resetSave()`
