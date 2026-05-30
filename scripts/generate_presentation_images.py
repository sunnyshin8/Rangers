#!/usr/bin/env python3
"""Create PNG previews for the 4 presentation slides for quick viewing."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

out_dir = Path('leak-radar/presentation/preview')
out_dir.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720

def save(img, name):
    p = out_dir / name
    img.save(p)
    print('Wrote', p)

def make_slide1():
    assets = Path('leak-radar/assets')
    cover = assets / 'cover_cartoon.png'
    if not cover.exists():
        cover = assets / 'cover.png'
    if cover.exists():
        im = Image.open(cover).convert('RGB')
        im = im.resize((W,H))
    else:
        im = Image.new('RGB', (W,H), 'white')
    save(im, 'slide_01.png')

def make_text_slide(title, lines, filename):
    img = Image.new('RGB', (W,H), 'white')
    d = ImageDraw.Draw(img)
    try:
        title_font = ImageFont.truetype('arial.ttf', 48)
        body_font = ImageFont.truetype('arial.ttf', 26)
    except Exception:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()

    d.rectangle([40,40,W-40,120], fill=(30,120,200))
    d.text((60,50), title, font=title_font, fill='white')

    y = 160
    for line in lines:
        d.text((80,y), '• ' + line, font=body_font, fill=(20,20,40))
        y += 48

    save(img, filename)

def main():
    make_slide1()
    make_text_slide('Problem', [
        'Secrets leak into repos, CI logs, and public feeds',
        'High noise/false positives',
        'Slow manual remediation'
    ], 'slide_02.png')

    make_text_slide('Solution: Leak Radar', [
        'Continuous scanning across repos, feeds and storage',
        'ML classifier to prioritize true findings',
        'Policy engine for automated responses and integrations'
    ], 'slide_03.png')

    make_text_slide('Next Steps & Demo', [
        'Run demo scan against a test repo',
        'Tune detectors and policies',
        'Integrate into CI and alert channels'
    ], 'slide_04.png')
    make_text_slide('Why Leak Radar is Unique', [
        'Cost-effective: incremental scans and prioritized findings',
        'Buffer-free streaming design with real-time processing',
        'Animated, interactive alerts: DMs/Slack with remediation actions',
        'Privacy-first redaction and audit exports'
    ], 'slide_05.png')

if __name__ == '__main__':
    main()
