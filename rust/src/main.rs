use std::path::Path;
use gdal::raster::Dataset;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;

type t = f64;

fn get(buff: &Buffer<t>, x: usize, y: usize) -> t {
    let (width, _height) = buff.size;
    buff.data[x * width + y]
}

fn main() {
    let dataset = Dataset::open(Path::new("../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13")).unwrap();
    let (width, height) = dataset.size();
    let raster: Buffer<t> = dataset.read_full_raster_as(1).unwrap();
    let mut max = 0.0;
    let mut min = std::f64::INFINITY;
    for x in 0..width-1 {
        for y in 0..height-1 {

        let p = get(&raster, x, y);
        if p > max {
            max = p
        }
        if p < min {
            min = p
        }
        }
        // println!("Awesome {}", p);
    }
    println!("Max {} {}", max, min);
    // for feature in layer.features() {
    //     let highway_field = feature.field("highway").unwrap();
    //     let geometry = feature.geometry();
    //     println!("{} {}", highway_field.into_string().unwrap(), geometry.wkt().unwrap());
    // }
    println!("Hello, world!");
}
