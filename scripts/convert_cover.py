#!/usr/bin/env python3
"""Convert SVG cover to PNG using cairosvg.

Usage:
  pip install cairosvg
  python scripts/convert_cover.py --input assets/cover.svg --output assets/cover.png --width 1920 --height 1080
"""
import argparse
from pathlib import Path
import sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    args = parser.parse_args()

    try:
        import cairosvg
    except Exception as e:
        print("cairosvg is required. Install with: pip install cairosvg", file=sys.stderr)
        raise

    inp = Path(args.input)
    out = Path(args.output)
    if not inp.exists():
        print(f"Input file not found: {inp}", file=sys.stderr)
        raise SystemExit(2)

    cairosvg.svg2png(url=str(inp), write_to=str(out), output_width=args.width, output_height=args.height)
    print(f"Wrote: {out}")

if __name__ == '__main__':
    main()
