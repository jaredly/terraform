use gdal::raster::dataset::Buffer;
use gdal::raster::Dataset;
use std::path::Path;

extern crate nalgebra as na;

extern crate geo;

use kiss3d::light::Light;
use kiss3d::resource::{IndexNum, Mesh};
use kiss3d::window::Window;
use na::{Point2, Point3, UnitQuaternion, Vector2, Vector3};
use std::time::SystemTime;

type MeshCell = Rc<RefCell<Mesh>>;

pub struct File {
    raster: Buffer<f32>,
    pub name: String,
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

    println!(
        "Dataset range: {}, {} - {} x {}",
        x0,
        y0,
        xdx * w as f64,
        ydy * h as f64
    );

    if w >= h {
        tl.haversine_distance(&tr)
    } else {
        tl.haversine_distance(&bl)
    }
}

impl File {
    pub fn from_dataset(dataset: &Dataset, file_name: String) -> File {
        let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
        let (width, height) = dataset.size();
        println!(
            "File loaded: {} points, {} x {}",
            raster.data.len(),
            width,
            height
        );
        File {
            name: file_name,
            raster,
            size: Vector2::new(width, height),
            longest_dim_in_meters: dataset_size_in_meters(dataset) as f32,
        }
    }

    fn get_terrain(&self, coords: &Coords, sample: usize, elevation_boost: f32) -> Option<Terrain> {
        if coords.validate(self) {
            let elevation_scale = if self.size.x >= self.size.y {
                self.size.x as f32 / coords.w as f32 * 1.0 / self.longest_dim_in_meters
            } else {
                self.size.y as f32 / coords.h as f32 * 1.0 / self.longest_dim_in_meters
            };
            Some(Terrain::from_raster(
                &self.raster,
                &coords,
                sample,
                self.size.x,
                elevation_scale * elevation_boost,
            ))
        } else {
            None
        }
    }

    fn get_hex_terrain(&self, hex: &Hex, sample: usize) -> Option<Terrain> {
        if true {
            let (_, _, w, h) = hex.bbox();
            let elevation_scale = if self.size.x >= self.size.y {
                self.size.x as f32 / w as f32 * 1.0 / self.longest_dim_in_meters
            } else {
                self.size.y as f32 / h as f32 * 1.0 / self.longest_dim_in_meters
            };
            Some(Terrain::from_hex(
                &self.raster,
                hex,
                sample,
                self.size.x,
                elevation_scale,
            ))
        } else {
            None
        }
    }

    pub fn get_hex(&self, hex: &Hex, sample: usize) -> Option<MeshCell> {
        self.get_hex_terrain(hex, sample).map(|t| t.to_mesh())
    }

    pub fn to_hex_stl(&self, hex: &Hex, sample: usize) -> Option<stl::BinaryStlFile> {
        self.get_hex_terrain(hex, sample).map(|m| m.to_stl())
    }

    pub fn to_stl(
        &self,
        coords: &Coords,
        sample: usize,
        elevation_boost: f32,
    ) -> Option<stl::BinaryStlFile> {
        self.get_terrain(coords, sample, elevation_boost)
            .map(|m| m.to_stl())
    }

    pub fn get_mesh(
        &self,
        coords: &Coords,
        sample: usize,
        elevation_boost: f32,
    ) -> Option<MeshCell> {
        self.get_terrain(coords, sample, elevation_boost)
            .map(|t| t.to_mesh())
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
            elevation_boost,
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

    pub fn center(&self) -> Point2<usize> {
        Point2::new(self.x + self.w / 2, self.y + self.h / 2)
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

    pub fn from_hex(
        raster: &Buffer<f32>,
        hex: &Hex,
        sample: usize,
        full_width: usize,
        elevation_scale: f32,
    ) -> Self {
        let (mut points, offsets) =
            hex_points(&raster.data, hex, sample, full_width, elevation_scale);
        let mut faces = hex_faces(hex, sample, offsets);

        {
            let hex = hex.sample(sample);
            let ln = points.len() as u32;
            let (_, _, ww, _) = hex.bbox();
            let ww = ww as f32;
            let mut corners = hex
                .corners()
                // .to_vec()
                .into_iter()
                .map(|i| {
                    println!("Corner {} {}", i.x, i.y);
                    Point3::new(i.x / ww, i.y / ww, 0.0)
                })
                .collect::<Vec<Point3<f32>>>();
            points.append(&mut corners);
            faces.push(Point3::new(ln, ln + 1, ln + 2));
            faces.push(Point3::new(ln + 3, ln + 4, ln + 5));
        }

        Terrain { points, faces }
    }

    pub fn to_stl(self) -> stl::BinaryStlFile {
        let mut header_80 = [0u8; 80];
        header_80[0] = 'r' as u8;
        header_80[0] = 'u' as u8;
        header_80[0] = 's' as u8;
        header_80[0] = 't' as u8;
        let header = stl::BinaryStlHeader {
            header: header_80,
            num_triangles: self.faces.len() as u32,
        };

        fn to_arr(p: Point3<f32>) -> [f32; 3] {
            [p.x, p.y, p.z]
        };

        fn v_to_arr(p: Vector3<f32>) -> [f32; 3] {
            [p.x, p.y, p.z]
        };

        let mut triangles = Vec::new();
        for indices in self.faces {
            let p1 = self.points[indices.x as usize];
            let p2 = self.points[indices.y as usize];
            let p3 = self.points[indices.z as usize];
            let normal = (p1 - p2).cross(&(p2 - p3));
            triangles.push(stl::Triangle {
                normal: v_to_arr(normal),
                v1: to_arr(p1),
                v2: to_arr(p2),
                v3: to_arr(p3),
                attr_byte_count: 0u16,
            });
        }
        let file = stl::BinaryStlFile { header, triangles };
        file
    }

    fn _to_mesh(self) -> Mesh {
        Mesh::new(self.points, self.faces, None, None, false)
    }

    pub fn to_mesh(self) -> MeshCell {
        std::rc::Rc::new(std::cell::RefCell::new(self._to_mesh()))
    }
}

#[derive(Clone, Copy)]
pub enum Border {
    // horizontal displacement
    One(f32),
    // vertical of the first, horizontal of the second
    Two(f32, f32),
}

#[derive(Clone, Copy)]
pub struct Hex {
    pub cx: usize,
    pub cy: usize,
    pub half_height: usize,
    half_width: usize,
}

impl Hex {
    pub fn new(cx: usize, cy: usize, half_height: usize) -> Self {
        let half_width = (2.0 * half_height as f32 / (3.0_f32).sqrt()).ceil() as usize + 1;
        Hex {
            cx,
            cy,
            half_height,
            half_width,
        }
    }

    pub fn sample(&self, sample: usize) -> Self {
        Hex::new(
            self.cx / sample,
            self.cy / sample,
            self.half_height / sample,
        )
    }

    pub fn corners(&self) -> [Point2<f32>; 6] {
        // let cx = self.cx as f32;
        // let cy = self.cy as f32;
        let hh = self.half_height as f32;
        let half_width = 2.0 * hh / (3.0_f32).sqrt();
        [
            // tl
            Point2::new(-half_width / 2.0, -hh),
            Point2::new(-half_width, 0.0),
            Point2::new(-half_width / 2.0, hh),
            Point2::new(half_width / 2.0, -hh),
            Point2::new(half_width, 0.0),
            Point2::new(half_width / 2.0, hh),
        ]
    }

    pub fn intercepts(&self, y: usize) -> (Border, usize, usize) {
        let m = (3.0_f32).sqrt();
        let b = (self.half_height * 2) as f32;
        let y = if y < self.half_height {
            self.half_height - 1 - y
        } else {
            y - self.half_height
        };
        // y = mx + b
        // y - b = mx
        // x = (y - b) / m
        let x = (y as f32 - b) / m;
        let dx = x - x.floor();
        let xi = x.ceil() as isize;

        let y_intercept = m * x.floor() + b;
        let dy = y as f32 - y_intercept;

        let border = if dy < 1.0 {
            Border::Two(dy, dx)
        } else {
            Border::One(dx)
        };

        (
            border,
            // xi is negative, so this is left then right intercepts
            (self.half_width as isize + xi) as usize,
            (self.half_width as isize - xi) as usize,
        )
    }

    pub fn width(&self) -> usize {
        self.half_width * 2
    }
    pub fn bbox(&self) -> (usize, usize, usize, usize) {
        (
            self.cx - self.half_width,
            self.cy - self.half_height,
            self.half_width * 2,
            self.half_height * 2,
        )
    }
}

fn extend_intercepts((border, min, max): (Border, usize, usize)) -> (usize, usize) {
    match border {
        Border::One(_) => (min - 1, max + 1),
        Border::Two(_, _) => (min - 2, max + 2),
    }
    // (min, max)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex() {
        let hex = Hex::new(30, 30, 10);
        let (x0, y0, w, h) = hex.bbox();
        for y in 0..h {
            let (border, x_min, x_max) = hex.intercepts(y);
            for x in 0..w {
                if x >= x_min && x < x_max {
                    print!("X")
                } else {
                    print!(".")
                }
            }
            match border {
                Border::One(dx) => println!(" - dx: {}", dx),
                Border::Two(dy, dx) => println!(" - dy: {}, dx: {}", dy, dx),
            }
        }
        assert_eq!(1, 1);
    }

    #[test]
    fn test_hex_points() {
        // 20 x 10
        let heights = [0.0_f32; 200].to_vec();
        let hex = Hex::new(10, 5, 4);
        let sample = 1;
        let (points, offsets) = hex_points(&heights, &hex, sample, 20, 1.0);
        for (i, offset) in offsets.iter().enumerate() {
            println!("Offset for {}: {}", i, offset);
        }
        let faces = hex_faces(&hex, sample, offsets);
        for face in faces {
            println!("{:?}", face);
            assert!(face.x < points.len() as u32);
            assert!(face.y < points.len() as u32);
            assert!(face.z < points.len() as u32);
        }
        // assert_eq!(1,1);
    }

}

fn hex_faces(
    hex: &Hex,
    sample: usize,
    offsets: Vec<usize>,
    // lengths: Vec<usize>,
) -> Vec<Point3<IndexNum>> {
    let sampled_hex = hex.sample(sample);
    let (_x0, _y0, ww, hh) = sampled_hex.bbox();

    let max = ww * hh;

    #[inline]
    fn at(ww: usize, offsets: &Vec<usize>, x: usize, y: usize) -> IndexNum {
        // println!("At ww: {}, ({}, {}), offset {}", ww, x, y, offsets[y]);
        (y * ww + x - offsets[y]) as IndexNum
    }

    let mut faces = Vec::with_capacity(max);
    for y in 0..hh {
        // let (border, x_min, x_max) = sampled_hex.intercepts(y);
        let (x_min, x_max) = extend_intercepts(sampled_hex.intercepts(y));
        // For some reason, once we pass the line of y = half_height,
        // the x_min is one too few? Or something weird is happening.
        // and the x_max is one too many
        // Ok now I fixed it (by the >= -> >) so that it's just
        // that the x_min is one too small....
        for x in x_min + 1..x_max - 1 {
            // let i = y * ww + x;

            faces.push(Point3::new(
                at(ww, &offsets, x + 1, y + 1),
                at(ww, &offsets, x, y),
                at(ww, &offsets, x, y + 1),
            ));
            faces.push(Point3::new(
                at(ww, &offsets, x + 1, y + 1),
                at(ww, &offsets, x + 1, y),
                at(ww, &offsets, x, y),
            ));
        }
    }
    faces
}

fn hex_points(
    raster: &Vec<f32>,
    hex: &Hex,
    sample: usize,
    full_width: usize,
    elevation_scale: f32,
) -> (
    // points
    Vec<Point3<f32>>,
    // offsets by line
    Vec<usize>,
) {
    let sampled_hex = hex.sample(sample);

    let (x0, y0, ww, hh) = sampled_hex.bbox();

    let max = ww * hh;
    println!("max points: {}", max);

    let scaler = if ww > hh { ww as f32 } else { hh as f32 };
    let scalew = ww as f32 / scaler;
    let scaleh = hh as f32 / scaler;

    let mut coords = Vec::with_capacity(max);
    let mut max: f32 = 0.0;
    let mut min: f32 = std::f32::INFINITY;
    let mut total_offset = 0;
    let mut offsets = Vec::with_capacity(hh);
    for y in 0..hh + 1 {
        // let (border, x_min, x_max) = sampled_hex.intercepts(y);
        let (border, x_min, x_max) = sampled_hex.intercepts(y);
        let (ex_min, ex_max) = extend_intercepts((border, x_min, x_max));

        total_offset += ex_min;
        offsets.push(total_offset);
        total_offset += ww - (ex_max + 1);

        match border {
            Border::One(dx) => {
                let x = x_min - 1;
                let p = raster[(y0 * sample + y * sample) * full_width + (x0 * sample + x * sample)];
                coords.push(Point3::new(
                    (x as f32 + dx) / scaler - scalew / 2.0,
                    -(y as f32 / scaler - scaleh / 2.0),
                    p,
                ))
            }
            Border::Two(dy, dx) => {
                // the dy one
                let x = x_min - 1;
                let p = raster[(y0 * sample + y * sample) * full_width + (x0 * sample + x * sample)];
                coords.push(Point3::new(
                    (x as f32) / scaler - scalew / 2.0,
                    -((y as f32 + dy) / scaler - scaleh / 2.0),
                    p,
                ));

                // the dx one
                let x = x_min - 1;
                let p = raster[(y0 * sample + y * sample) * full_width + (x0 * sample + x * sample)];
                coords.push(Point3::new(
                    (x as f32 + dx) / scaler - scalew / 2.0,
                    -(y as f32 / scaler - scaleh / 2.0),
                    p,
                ));
            }
        }

        for x in x_min..ex_max + 1 {
            let p = raster[(y0 * sample + y * sample) * full_width + (x0 * sample + x * sample)];
            max = max.max(p);
            min = min.min(p);
            coords.push(Point3::new(
                x as f32 / scaler - scalew / 2.0,
                -(y as f32 / scaler - scaleh / 2.0),
                p,
            ));
        }
    }
    println!("Max {} min {}", max, min);
    profile!("Rescale things", {
        for point in coords.iter_mut() {
            point.z = (point.z - min) * elevation_scale;
        }
    });
    (coords, offsets)
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
    for y in 0..hh {
        for x in 0..ww {
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
    for y in 0..hh - 1 {
        for x in 0..ww - 1 {
            let i = y * ww + x;
            faces.push(Point3::new(
                (i + ww + 1) as IndexNum,
                (i) as IndexNum,
                (i + ww) as IndexNum,
            ));
            faces.push(Point3::new(
                (i + ww + 1) as IndexNum,
                (i + 1) as IndexNum,
                (i) as IndexNum,
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
