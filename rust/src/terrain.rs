use gdal::raster::dataset::Buffer;
use gdal::raster::Dataset;
use std::path::Path;

extern crate nalgebra as na;

extern crate geo;

use kiss3d::light::Light;
use kiss3d::resource::{IndexNum, Mesh};
use kiss3d::window::Window;
use na::{Point3, UnitQuaternion, Vector2, Vector3};
use std::time::SystemTime;

type MeshCell = Rc<RefCell<Mesh>>;

pub struct File {
    raster: Buffer<f32>,
    pub size: Vector2<usize>,
    pub longest_dim_in_meters: f32,
}

/// Thinking about lat/long & scaling the height of things appropriately....
/// We get elevation in Meters
/// We get x/y in usize, which can be converted to lat/long with some effort.
/// lat/long can then be turned into Meters, and then I can figure out how heigh
/// the mountains should be
///
/// I guess I don't need to do *too* much work ---
/// It's enough to get a basic: Here's the [maxdim] of the original in Meters
/// And so the height should be [elevation]/[maxdim] to be scaled correctly
/// And then with a subset it's the same
///
/// Xgeo = GT(0) + Xpixel*GT(1) + Yline*GT(2)
/// Ygeo = GT(3) + Xpixel*GT(4) + Yline*GT(5)

fn dataset_size_in_meters(dataset: &Dataset) -> f64 {
    use geo::prelude::HaversineDistance;
    let geot = dataset.geo_transform().unwrap();
    let (w, h) = dataset.size();
    let x0 = geot[0];
    let xdx = geot[1];
    let _xdy = geot[2];
    let y0 = geot[3];
    let _ydx = geot[4];
    let ydy = geot[5];

    // Top left to Top right
    // Top left to Bottom left

    let tl = geo::Point::from((x0, y0));
    let tr = geo::Point::from((x0 + xdx * w as f64, y0));
    let bl = geo::Point::from((x0, y0 + ydy * h as f64));

    if w >= h {
        tl.haversine_distance(&tr)
    } else {
        tl.haversine_distance(&bl)
    }
}

impl From<&Dataset> for File {
    fn from(dataset: &Dataset) -> File {
        let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
        let (width, height) = dataset.size();
        println!(
            "File loaded: {} points, {} x {}",
            raster.data.len(),
            width,
            height
        );
        // let d = dataset.driver();
        // println!(
        //     "More data: 
        // Count: {}
        // Projection: {}
        // Driver (short): {}
        // Driver (long): {}",
        //     dataset.count(),
        //     dataset.projection(),
        //     d.short_name(),
        //     d.long_name()
        // );
        // match dataset.geo_transform() {
        //     Err(_) => println!("No transform"),
        //     Ok(geo) => println!(
        //         "Yes transform
        //     {}
        //     {}
        //     {}
        //     {}
        //     {}
        //     {}",
        //         geo[0], geo[1], geo[2], geo[3], geo[4], geo[5]
        //     ),
        // }
        File {
            raster,
            size: Vector2::new(width, height),
            longest_dim_in_meters: dataset_size_in_meters(dataset) as f32
        }
    }
}

impl File {
    fn get_terrain(&self, coords: &Coords, sample: usize, elevation_boost: f32) -> Option<Terrain> {
        if coords.validate(self) {
            let elevation_scale = if self.size.x >= self.size.y {
                self.size.x as f32 / coords.w as f32 * 1.0 / self.longest_dim_in_meters
            } else {
                self.size.y as f32 / coords.h as f32 * 1.0 / self.longest_dim_in_meters
            };
            // let scale = if coords.w >= coords.h {

            // }
            Some(Terrain::from_raster(
                &self.raster,
                &coords,
                sample,
                self.size.x,
                elevation_scale * elevation_boost
            ))
        } else {
            None
        }
    }

    pub fn get_mesh(&self, coords: &Coords, sample: usize, elevation_boost: f32) -> Option<MeshCell> {
        self.get_terrain(coords, sample, elevation_boost).map(|t| t.to_mesh())
    }

    pub fn full_mesh(&self, sample: usize, elevation_boost: f32) -> MeshCell {
        self.get_mesh(
            &Coords {
                x: 0,
                y: 0,
                // w: 30,
                // h: 40,
                w: self.size.x,
                h: self.size.y,
            },
            sample,
            elevation_boost
        )
        .unwrap()
    }
}

#[derive(Clone)]
pub struct Terrain {
    pub points: Vec<Point3<f32>>,
    pub faces: Vec<Point3<IndexNum>>,
}

#[derive(Clone, Copy)]
pub struct Coords {
    pub x: usize,
    pub y: usize,
    pub w: usize,
    pub h: usize,
}

impl Coords {
    pub fn from_dataset(dataset: &Dataset) -> Coords {
        let (w, h) = dataset.size();
        Coords { x: 0, y: 0, w, h }
    }

    pub fn validate(&self, file: &File) -> bool {
        let size = file.size;
        self.x + self.w <= size.x && self.y + self.h <= size.y
    }
}

use std::cell::RefCell;
use std::rc::Rc;
impl Terrain {
    /// Create a terrain with points and faces
    pub fn from_raster(
        raster: &Buffer<f32>,
        coords: &Coords,
        sample: usize,
        full_width: usize,
        elevation_scale: f32,
    ) -> Self {
        Terrain {
            points: to_points(raster, coords, sample, full_width, elevation_scale),
            faces: gen_faces(coords.w, coords.h, sample),
        }
    }

    pub fn to_mesh(self) -> MeshCell {
        let mesh = Mesh::new(self.points, self.faces, None, None, false);
        std::rc::Rc::new(std::cell::RefCell::new(mesh))
    }
}

fn to_points(
    raster: &Buffer<f32>,
    Coords { x: x0, y: y0, w, h }: &Coords,
    sample: usize,
    full_width: usize,
    elevation_scale: f32,
) -> Vec<Point3<f32>> {
    let ww = w / sample;
    let hh = h / sample;
    let total = ww * hh;

    let scaler = if ww > hh { ww as f32 } else { hh as f32 };
    let scalew = ww as f32 / scaler;
    let scaleh = hh as f32 / scaler;

    let mut coords = Vec::with_capacity(total);
    println!("Total points: {}", total);
    let mut max = 0.0;
    let mut min = std::f32::INFINITY;
    // coords will look like
    // (0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2),
    // to turn [x, y] into an index, you do (x * h + y)
    // raster data looks like
    //
    for x in 0..ww {
        for y in 0..hh {
            let p = raster.data[(y0 + y * sample) * full_width + (x0 + x * sample)];

            if p > max {
                max = p
            }
            if p < min {
                min = p
            }

            coords.push(Point3::new(
                x as f32 / scaler - scalew / 2.0,
                -(y as f32 / scaler - scaleh / 2.0),
                p,
            ));
        }
    }
    println!("Max {} min {}", max, min);
    // let scale = max - min;
    // let m = if w > h { w.to_owned() } else { h.to_owned() };
    // let scale = scale * 20.0 / (full_width as f32 / (m) as f32);
    // let scale = zscale / (full_width / scaler)
    profile!("Rescale things", {
        for point in coords.iter_mut() {
            point.z = (point.z - min) * elevation_scale;
        }
    });
    coords
}

// fn to_points2(dataset: &Dataset, sample: usize) -> Vec<Point3<f32>> {
//     let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
//     let (width, height) = dataset.size();

//     (0..width)
//         .step_by(sample)
//         .flat_map(|x: usize| (0..height).step_by(sample).map(move |y: usize| (x, y)))
//         .map(|(x, y)| Point3::new(x as f32, y as f32, raster.data[x * width + y]))
//         .collect()
// }

fn gen_faces(width: usize, height: usize, sample: usize) -> Vec<Point3<IndexNum>> {
    let ww = width / sample;
    let hh = height / sample;
    let total = ww * hh;

    let mut faces = Vec::with_capacity(total);
    for x in 0..ww - 2 {
        for y in 0..hh - 2 {
            let i = x * hh + y;
            faces.push(Point3::new(
                (i + hh + 1) as IndexNum,
                (i + hh) as IndexNum,
                (i) as IndexNum,
            ));
            faces.push(Point3::new(
                (i + hh + 1) as IndexNum,
                (i) as IndexNum,
                (i + 1) as IndexNum,
            ));
        }
    }
    faces
}

// pub fn load_file(dataset: &Dataset, sample: usize) -> MeshCell {
//     let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
//     let (width, height) = dataset.size();
//     println!("Size: {} by {}", width, height);

//     let coords = profile!(
//         "First",
//         to_points(&raster, &Coords::from_dataset(dataset), sample, height)
//     );
//     let faces = gen_faces(width, height, sample);

//     let mesh = Mesh::new(coords, faces, None, None, false);
//     std::rc::Rc::new(std::cell::RefCell::new(mesh))
// }
