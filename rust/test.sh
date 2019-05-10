
# Export test
cargo run --release export ../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13 3088 7283 500 ./hex.stl

# Small hex for edges test
cargo run --release ../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13 2774 6997 630 577 3088 7283 5