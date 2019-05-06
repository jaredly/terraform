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
    size: Vector2<usize>,
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
                self.size.y,
            ))
        } else {
            None
        }
    }

    pub fn get_mesh(&self, coords: &Coords, sample: usize) -> Option<MeshCell> {
        self.get_terrain(coords, sample).map(|t| t.to_mesh())
    }

    pub fn full_mesh(&self, sample: usize) -> MeshCell {
        self.get_mesh(&Coords { x: 0, y: 0, w: self.size.x, h: self.size.y }, sample).unwrap()
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

    // pub fn validate(&self, dataset: &Dataset) -> bool {
    //     let (w, h) = dataset.size();
    //     self.x + self.w <= w && self.y + self.h <= h
    // }

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
        full_height: usize,
    ) -> Self {
        Terrain {
            points: to_points(raster, coords, sample, full_height),
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
    full_height: usize,
) -> Vec<Point3<f32>> {
    let ww = w / sample;
    let hh = h / sample;
    let total = ww * hh;

    let mut coords = Vec::with_capacity(total);
    let mut max = 0.0;
    let mut min = std::f32::INFINITY;
    for x in 0..ww {
        for y in 0..hh {
            let p = raster.data[(y0 + y * sample) * full_height + (x0 + x * sample)];

            if p > max {
                max = p
            }
            if p < min {
                min = p
            }

            coords.push(Point3::new(
                x as f32 / ww as f32 - 0.5,
                -(y as f32 / hh as f32 - 0.5),
                p,
            ));
        }
    }
    println!("Max {} min {}", max, min);
    profile!("Rescale things", {
        let scale = max - min;
        for point in coords.iter_mut() {
            point.z = (point.z - min) / scale / 20.0;
        }
    });
    coords
}

fn to_points2(dataset: &Dataset, sample: usize) -> Vec<Point3<f32>> {
    let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
    let (width, height) = dataset.size();

    (0..width)
        .step_by(sample)
        .flat_map(|x: usize| (0..height).step_by(sample).map(move |y: usize| (x, y)))
        .map(|(x, y)| Point3::new(x as f32, y as f32, raster.data[x * width + y]))
        .collect()
}

fn gen_faces(width: usize, height: usize, sample: usize) -> Vec<Point3<IndexNum>> {
    let ww = width / sample;
    let hh = height / sample;
    let total = ww * hh;

    let mut faces = Vec::with_capacity(total);
    for x in 0..ww - 1 {
        for y in 0..hh - 1 {
            let i = x * ww + y;
            faces.push(Point3::new(
                (i + ww + 1) as IndexNum,
                (i + ww) as IndexNum,
                (i) as IndexNum,
            ));
            faces.push(Point3::new(
                (i + ww + 1) as IndexNum,
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
