"""Generates the Devpost thumbnail deterministically. No AI text generation —
every string below is authored and verified against the actual product, so
nothing fabricated can end up in the submission."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1500, 1000  # 3:2, per Devpost's recommended ratio

NAVY = (23, 36, 60)
SAGE = (237, 245, 239)
SAGE_TEXT = (64, 90, 80)
GREEN = (58, 122, 92)
CREAM = (250, 248, 244)
RED = (176, 58, 58)
INK = (23, 30, 42)
MUTED = (140, 148, 160)
GOLD = (244, 198, 92)

serif_bold = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", s)
serif_it = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia Italic.ttf", s)
serif = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", s)
sans_bold = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", s)
sans = lambda s: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", s)

img = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(img)

# Top wordmark strip
d.rectangle([0, 0, W, 92], fill=CREAM)
d.ellipse([56, 28, 92, 64], fill=INK)
d.text((66, 33), "O", font=sans_bold(22), fill=CREAM, anchor="lm")
d.text((104, 46), "OVERTURN", font=sans_bold(24), fill=INK, anchor="lm")
d.text((W - 56, 46), "DEVNETWORK HACKATHON 2026", font=sans_bold(15), fill=MUTED, anchor="rm")
d.line([0, 92, W, 92], fill=(215, 218, 210), width=2)

body_top, body_bottom = 92, H - 118
mid = W // 2

# Left panel — the rejection
d.rectangle([0, body_top, mid, body_bottom], fill=NAVY)
lx = 70
d.text((lx, body_top + 56), "THE REJECTION", font=sans_bold(16), fill=(154, 168, 196), anchor="lm")

def wrap_draw(draw, text, font, x, y, max_width, fill, line_gap=1.28):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) > max_width and cur:
            lines.append(cur); cur = w
        else:
            cur = test
    if cur: lines.append(cur)
    for i, line in enumerate(lines):
        draw.text((x, y + i * font.size * line_gap), line, font=font, fill=fill)
    return y + len(lines) * font.size * line_gap

y = wrap_draw(d, "“Pre-existing condition was not disclosed.”", serif_bold(40), lx, body_top + 96, mid - lx - 60, CREAM)
y += 34
d.text((lx, y), "NO FRAUD ALLEGED IN THE LETTER", font=sans_bold(15), fill=(224, 150, 150), anchor="lm")

# Right panel — the rule
d.rectangle([mid, body_top, W, body_bottom], fill=SAGE)
rx = mid + 70
d.text((rx, body_top + 56), "THE RULE THAT APPLIES", font=sans_bold(16), fill=(90, 116, 104), anchor="lm")
d.text((rx, body_top + 108), "63", font=serif_bold(120), fill=INK, anchor="lt")
num_w = d.textlength("63", font=serif_bold(120))
d.multiline_text((rx + num_w + 18, body_top + 190), "months of\ncontinuous coverage", font=sans(20), fill=SAGE_TEXT, spacing=6)

quote_y = body_top + 300
quote_x = rx + 28
wrap_draw(d, "“…no policy and claim shall be contestable… except on grounds of established fraud.”",
          serif_it(22), quote_x, quote_y, W - quote_x - 70, (52, 66, 60), line_gap=1.4)
d.line([rx, quote_y - 10, rx, quote_y + 96], fill=GREEN, width=4)

d.text((rx, body_bottom - 46), "IRDAI Master Circular on Health Insurance Business · 29 May 2024", font=sans(14), fill=(120, 138, 128), anchor="lm")

# Bottom verdict banner
d.rectangle([0, body_bottom, W, H], fill=INK)
d.text((70, body_bottom + 34), "CONTRADICTION FOUND", font=sans_bold(20), fill=GOLD, anchor="lm")
d.text((70, body_bottom + 78), "The insurer used a ground that stopped applying three months ago.", font=serif(24), fill=CREAM, anchor="lm")

img.save("/Users/ashraf/Desktop/PROJECTS/DevNetwork [API + Cloud + AI] Hackathon 2026/assets/thumbnail.jpg", quality=95)
print("saved", img.size)
