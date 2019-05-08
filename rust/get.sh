# curl -G -v -L -o something "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=11.5,48.1,11.6,48.2]"
# curl -G -v -L -o timpp "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-112.0,40.9,-111.9,41.0]"
curl -G -v -L -o trails_timpp "http://www.overpass-api.de/api/xapi_meta" --data-urlencode "node[bbox=-112.0,40.0,-111.0,41.0][leisure=trailhead]"
# curl -L -o output https://api.openstreetmap.org/api/0.6/node?bbox=11.54,48.14,11.543,48.145

# "https://informationfreeway.org/api/0.6/"