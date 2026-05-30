#!/usr/bin/env python3
"""Generate a simple cover PNG using Pillow as a fallback when Cairo isn't available."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1920, 1080
out = Path('leak-radar/assets/cover.png')
out.parent.mkdir(parents=True, exist_ok=True)

def draw_gradient(draw, w, h, start=(15,23,36), end=(11,58,91)):
    for i in range(h):
        t = i / (h-1)
        r = int(start[0] * (1-t) + end[0] * t)
        g = int(start[1] * (1-t) + end[1] * t)
        b = int(start[2] * (1-t) + end[2] * t)
        draw.line([(0,i),(w,i)], fill=(r,g,b))

img = Image.new('RGB', (W, H), color=(15,23,36))
draw = ImageDraw.Draw(img)
draw_gradient(draw, W, H)

# semi-transparent panel
panel = Image.new('RGBA', (1680,840), (7,40,38,40))
img.paste(panel, (120,120), panel)

# accent bar
draw.rectangle([200,340,1700,346], fill=(31,162,255))

# draw circle accent
draw.ellipse([200,200,328,328], fill=(31,162,255))

# Text (use default font)
try:
    title_font = ImageFont.truetype('arial.ttf', 96)
    subtitle_font = ImageFont.truetype('arial.ttf', 22)
    small_font = ImageFont.truetype('arial.ttf', 18)
except Exception:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    small_font = ImageFont.load_default()

draw.text((370,190), 'Leak Radar', font=title_font, fill=(255,255,255))
draw.text((370,260), 'Real-time detection and automated remediation for exposed secrets', font=subtitle_font, fill=(207,232,255))

draw.text((150,980), 'Leak Radar — leak-radar project', font=small_font, fill=(159,191,220))

img.save(out)
print('Wrote', out)
