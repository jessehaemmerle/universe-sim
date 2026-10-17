"""Build the Earth textures used by the game from NASA Visible Earth source images.

Sources (public domain, NASA Earth Observatory / Visible Earth):
  color.jpg  world.topo.200407.3x5400x2700.jpg      Blue Marble Next Generation, July, topography
  elev.jpg   gebco_08_rev_elev_5400x2700.jpg         land elevation, black = 0 m, white = 6400 m
  bath.jpg   gebco_08_rev_bath_5400x2700.jpg         ocean depth, white = 0 m, black = 8000 m
  night.jpg  BlackMarble_2012_01deg_gray.jpg         city lights

Usage: python3 tools/make_textures.py <dir-with-sources> <out-dir>

Outputs:
  earth-color-4k.jpg / earth-color-2k.jpg   land albedo
  earth-data.png  R = signed sqrt height (128 = sea level), G = night lights, B = land ice mask
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
LAND_MAX, SEA_MAX = 6400.0, 8000.0

color_img = Image.open(f"{SRC}/color.jpg").convert("RGB")
color = np.asarray(color_img).astype(np.int32)
elev = np.asarray(Image.open(f"{SRC}/elev.jpg").convert("L")).astype(np.float32)
bath = np.asarray(Image.open(f"{SRC}/bath.jpg").convert("L").filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)
night = Image.open(f"{SRC}/night.jpg").convert("L")

h, w = elev.shape
lat = np.linspace(90, -90, h)[:, None] * np.ones((1, w))

# Blue Marble water is near-black navy; land is never that dark.
water = (color.sum(-1) < 45) & (color.max(-1) < 30)

land_m = np.maximum(elev / 255.0 * LAND_MAX, 1.0)
sea_m = np.maximum((255.0 - bath) / 255.0 * SEA_MAX, 12.0)
height = np.where(water, -sea_m, land_m)

enc = np.where(height >= 0,
               128 + 127 * np.sqrt(np.clip(height / LAND_MAX, 0, 1)),
               128 - 127 * np.sqrt(np.clip(-height / SEA_MAX, 0, 1)))

# Permanent ice: bright, unsaturated land at high latitude or high altitude.
mn, mx = color.min(-1), color.max(-1)
ice = (~water) & (mn > 185) & (mx - mn < 30) & ((np.abs(lat) > 58) | (land_m > 4200))
ice_img = Image.fromarray((ice * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))

size = (2048, 1024)
r = Image.fromarray(np.clip(enc, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)
g = night.resize(size, Image.LANCZOS)
b = ice_img.resize(size, Image.LANCZOS)
Image.merge("RGB", (r, g, b)).save(f"{OUT}/earth-data.png", optimize=True)

color_img.resize((4096, 2048), Image.LANCZOS).save(f"{OUT}/earth-color-4k.jpg", quality=84, optimize=True, progressive=True)
color_img.resize((2048, 1024), Image.LANCZOS).save(f"{OUT}/earth-color-2k.jpg", quality=84, optimize=True, progressive=True)

wgt = np.cos(np.radians(lat))
print("ocean area fraction", float((water * wgt).sum() / wgt.sum()))
print("ice area fraction", float((ice * wgt).sum() / wgt.sum()))
