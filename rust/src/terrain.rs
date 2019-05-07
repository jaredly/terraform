use gdal::raster::dataset::Buffer;
use gdal::raster::Dataset;
use std::path::Path;

extern crate nalgebra as na;

use kiss3d::light::Light;
use kiss3d::resource::{IndexNum, Mesh};
use kiss3d::window::Window;
use na::{Point3, UnitQuaternion, Vector2, Vector3};
use std::time::SystemTime;

type MeshCell = Rc<RefCell<Mesh>>;

pub struct File {
    raster: Buffer<f32>,
    pub size: Vector2<usize>,
}

impl From<&Dataset> for File {
    fn from(dataset: &Dataset) -> File {
        let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
        let (width, height) = dataset.size();
        File {
            raster,
            size: Vector2::new(width, height),
        }
    }
}

impl File {
    fn get_terrain(&self, coords: &Coords, sample: usize) -> Option<Terrain> {
        if coords.validate(self) {
            Some(Terrain::from_raster(
                &self.raster,
                &coords,
                sample,
                self.size.x,
            ))
        } else {
            None
        }
    }

    pub fn get_mesh(&self, coords: &Coords, sample: usize) -> Option<MeshCell> {
        self.get_terrain(coords, sample).map(|t| t.to_mesh())
    }

    pub fn full_mesh(&self, sample: usize) -> MeshCell {
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
    ) -> Self {
        Terrain {
            points: to_points(raster, coords, sample, full_width),
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
    let scale = max - min;
    let m = if w > h {w.to_owned() } else {h.to_owned()};
    let scale = scale * 20.0 / (full_width as f32 / (m) as f32);
    // let scale = zscale / (full_width / scaler)
    profile!("Rescale things", {
        for point in coords.iter_mut() {
            point.z = (point.z - min) / scale;
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
