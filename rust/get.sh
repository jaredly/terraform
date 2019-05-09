# curl -G -v -L -o something "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=11.5,48.1,11.6,48.2]"
# curl -G -v -L -o timpp "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-112.0,40.9,-111.9,41.0]"
# curl -G -v -L -o highway.xml "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-113.0,39.0,-110.0,42.0][highway=trailhead]"
# curl -G -v -L -o type.xml "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-113.0,39.0,-110.0,42.0][type=trailhead]"
# curl -G -v -L -o amenity.xml "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-113.0,39.0,-110.0,42.0][amenity=trailhead]"
curl -G -v -L -o tourism_viewpoint.xml "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-113.0,39.0,-110.0,42.0][tourism=viewpoint]"
# curl -G -v -L -o all_timpp.xml "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-113.0,39.0,-110.0,42.0]"
# curl -L -o output https://api.openstreetmap.org/api/0.6/node?bbox=11.54,48.14,11.543,48.145

# "https://informationfreeway.org/api/0.6/"

# barrier=entrance x3
# barrier=gate
# leisure=trailhead
# leisure=park
# tourism=information
# tourism=camp_site
# checkpoint=hiking
# amenity=parking
# "name = something with trailhead"

## Mountain Peaks

# [bbox:{{bbox}}];
# (
#   node[natural=peak];
# );
# out;

## Trailheads

# [bbox:{{bbox}}];
# // relation[route=hiking][network~"^.wn$"] -> .rels;
# // .rels > -> .alls;
# // node.alls[place=locality];
# node[place=locality];
# out;

# http://toolserver.org/tiles/hikebike/${z}/${x}/${y}.png
#
#

# import math
# Zoom at 8 I think
# def deg2num(lat_deg, lon_deg, zoom):
#   lat_rad = math.radians(lat_deg)
#   n = 2.0 ** zoom
#   xtile = int((lon_deg + 180.0) / 360.0 * n)
#   ytile = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
#   return (xtile, ytile)


