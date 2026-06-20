# App icons

`icon.svg` is included and works for most things. For the most reliable
Android "Install app" experience, also drop two PNGs in this folder:

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Quick way to generate them from the SVG (any machine with rsvg or ImageMagick):

```bash
# rsvg-convert
rsvg-convert -w 192 -h 192 icon.svg > icon-192.png
rsvg-convert -w 512 -h 512 icon.svg > icon-512.png

# or ImageMagick
magick -background none icon.svg -resize 192x192 icon-192.png
magick -background none icon.svg -resize 512x512 icon-512.png
```

Or use any online "SVG to PNG" tool. The manifest already references them.
