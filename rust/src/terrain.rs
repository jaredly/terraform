use std::path::Path;
use gdal::raster::Dataset;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;

extern crate nalgebra as na;

use na::{Vector3, UnitQuaternion, Point3};
use kiss3d::window::Window;
use kiss3d::light::Light;
use kiss3d::resource::{Mesh, IndexNum};
use std::time::SystemTime;


fn to_points(dataset: &Dataset, sample: usize) -> Vec<Point3<f32>> {
    let raster: Buffer<f32> = dataset.read_full_raster_as(1).unwrap();
    let (width, height) = dataset.size();

    let ww = width / sample;
    let hh = height / sample;
    let total = ww * hh;

    let mut coords = Vec::with_capacity(total);
    let mut max = 0.0;
    let mut min = std::f32::INFINITY;
    for x in (0..ww - 0) {
        for y in (0..hh - 0) {
            let p = raster.data[(ww - x) * sample * width + y * sample];

            if p > max {
                max = p
            }
            if p < min {
                min = p
            }

            coords.push(Point3::new(
                x as f32 / ww as f32 - 0.5,
                y as f32 / hh as f32 - 0.5,
                p));
        }
    }
    println!("Max {} min {}", max, min);
    profile!("Rescale things", {
        let scale = max - min;
        for point in coords.iter_mut() {
            point.z = - (point.z - min) / scale / 20.0;
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
    .map(|(x, y)| Point3::new(x as f32, y as f32, raster.data[x * width + y])).collect()
}

fn gen_faces(width: usize, height: usize, sample: usize) -> Vec<Point3<IndexNum>> {
    let ww = width / sample;
    let hh = height / sample;
    let total = ww * hh;

    let mut faces = Vec::with_capacity(total);
    for x in 0..ww-1 {
        for y in 0..hh-1 {
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

use std::rc::Rc;
use std::cell::RefCell;
pub fn load_file(dataset: &Dataset, sample: usize) -> Rc<RefCell<Mesh>> {
    let (width, height) = dataset.size();
    println!("Size: {} by {}", width, height);

    let coords = profile!("First", to_points(&dataset, sample));
    let faces = gen_faces(width, height, sample);

    let mesh = Mesh::new(coords, faces, None, None, false);
    std::rc::Rc::new(std::cell::RefCell::new(mesh))
}
