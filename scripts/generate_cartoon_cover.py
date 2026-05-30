#!/usr/bin/env python3
"""Generate a bright, mascot-style cover image using Pillow.
Produces `leak-radar/assets/cover_cartoon.png`.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1920, 1080
out = Path('leak-radar/assets/cover_cartoon.png')
out.parent.mkdir(parents=True, exist_ok=True)

def draw_radial_gradient(img, inner=(255,200,80), outer=(30,120,255)):
    px = img.load()
    cx, cy = W//2, H//2
    maxr = (cx*cx + cy*cy) ** 0.5
    for y in range(H):
        for x in range(W):
            dx = x - cx
            dy = y - cy
            r = (dx*dx + dy*dy) ** 0.5
            t = min(1, r/maxr)
            rcol = int(inner[0]*(1-t) + outer[0]*t)
            gcol = int(inner[1]*(1-t) + outer[1]*t)
            bcol = int(inner[2]*(1-t) + outer[2]*t)
            px[x,y] = (rcol, gcol, bcol)

img = Image.new('RGB', (W, H), color=(30,120,255))
draw = ImageDraw.Draw(img)
draw_radial_gradient(img, inner=(255,180,100), outer=(10,40,150))

# add glossy rounded panel
panel_w, panel_h = 1600, 760
panel_x, panel_y = (W-panel_w)//2, (H-panel_h)//2
panel = Image.new('RGBA', (panel_w, panel_h), (255,255,255,0))
pd = ImageDraw.Draw(panel)
pd.rounded_rectangle([0,0,panel_w,panel_h], radius=32, fill=(255,255,255,180))
img.paste(panel, (panel_x, panel_y), panel)

# mascot body (cute creature)
md = ImageDraw.Draw(img)
mx, my = panel_x + 300, panel_y + 220
body_w, body_h = 560, 520
md.ellipse([mx, my, mx+body_w, my+body_h], fill=(255,220,90), outline=(255,200,60), width=6)

# ears/antennae
md.polygon([(mx+80,my+30),(mx+40,my-40),(mx+140,my+10)], fill=(255,200,60))
md.polygon([(mx+420,my+30),(mx+460,my-40),(mx+380,my+10)], fill=(255,200,60))

# eyes
eye_w = 110
lx = mx+160
ly = my+160
md.ellipse([lx,ly,lx+eye_w,ly+eye_w], fill=(20,30,40))
md.ellipse([lx+12,ly+18,lx+40,ly+48], fill=(255,255,255))
rx = mx+320
md.ellipse([rx,ly,rx+eye_w,ly+eye_w], fill=(20,30,40))
md.ellipse([rx+12,ly+18,rx+40,ly+48], fill=(255,255,255))

# blush
md.ellipse([mx+130,my+300,mx+200,my+360], fill=(255,120,140))
md.ellipse([mx+360,my+300,mx+430,my+360], fill=(255,120,140))

# smile
md.arc([mx+170,my+250,mx+430,my+380], start=20, end=160, fill=(40,20,10), width=8)

# sparkle accents
for sx, sy, s in [(mx+520,my+60,1.0),(mx+620,my+140,0.7),(mx+480,my+380,0.6)]:
    r = 18
    md.ellipse([sx-r,sy-r,sx+r,sy+r], fill=(255,255,255,200))

# title text
try:
    title_font = ImageFont.truetype('arial.ttf', 84)
    subtitle_font = ImageFont.truetype('arial.ttf', 26)
except Exception:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()

tx = panel_x + 920
ty = panel_y + 180
md.text((tx,ty), 'Leak Radar', font=title_font, fill=(10,24,40))
md.text((tx,ty+110), 'Catch exposed secrets fast — prioritized with ML', font=subtitle_font, fill=(20,50,80))

# footer
md.text((panel_x+40, panel_y+panel_h-40), 'leak-radar project', font=subtitle_font, fill=(30,60,90))

img.save(out)
print('Wrote', out)
