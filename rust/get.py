import math
def deg2num(lat_deg, lon_deg, zoom):
  lat_rad = math.radians(lat_deg)
  n = 2.0 ** zoom
  xtile = int((lon_deg + 180.0) / 360.0 * n)
  ytile = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
  return (xtile, ytile)

# n41w112 at zoom 8 became (41, -112) which became (48, 95) BUT we needed 48, 96
# also it's way too zoomed out
# will need to do a whole thing I think
print deg2num(41, -112, 9)
