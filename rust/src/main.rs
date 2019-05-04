use std::path::Path;
use gdal::raster::Dataset;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;

extern crate kiss3d;
extern crate nalgebra as na;

use na::{Vector3, UnitQuaternion, Point3};
use kiss3d::window::Window;
use kiss3d::light::Light;
use kiss3d::resource::{Mesh, IndexNum};
use std::time::SystemTime;

fn since(t: SystemTime) -> u128 {
    SystemTime::now().duration_since(t).unwrap().as_millis()
}

macro_rules! profile {
    ( $message:expr, $x:expr ) => {
        {
            let start = SystemTime::now();
            let result = $x;
            println!("{} took {}", $message, since(start));
            result
        }
    };
}

// fn profile<Output: Sized>(func: Fn() -> Output) -> Output {
//     let now = SystemTime::now();
//     let result = func();
//     result
// }

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
    let scale = max - min;
    for point in coords.iter_mut() {
        point.z = - (point.z - min) / scale / 20.0;
    }
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

fn load_file(sample: usize) -> Mesh {
    let dataset = Dataset::open(Path::new("../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13")).unwrap();
    let (width, height) = dataset.size();
    println!("Size: {} by {}", width, height);

    let coords = profile!("First", to_points(&dataset, sample));
    let faces = gen_faces(width, height, sample);

    Mesh::new(coords, faces, None, None, false)
}

fn main() {
    let mut window = Window::new("Topo");
    window.set_light(Light::StickToCamera);

    let mut c      = window.add_cube(0.1, 0.1, 0.1);
    c.set_color(1.0, 0.0, 1.0);

    // let example = Mesh::new(
    //     vec![
    //         Point3::new(0.0, 0.0, 0.0),
    //         Point3::new(1.0, 0.0, -1.0),
    //         Point3::new(1.0, 1.0, 0.0),
    //         // Point3::new(10.0, 0.0, 10.0),
    //     ],
    //     vec![
    //         // counter-clockwise for to show
    //         // TODO look up how to stop backface culling if I can?
    //         Point3::new(1, 0, 2),
    //         // Point3::new(1, 2, 3),
    //         // Point3::new(3, 0, 2),
    //     ],
    //     None,
    //     None,
    //     false
    // );
    // let exc = std::rc::Rc::new(std::cell::RefCell::new(example));

    let stuff = profile!("Load file", load_file(10));
    let rc = std::rc::Rc::new(std::cell::RefCell::new(stuff));

    let mut mesh_node = window.add_mesh(rc, Vector3::new(1.0, 1.0, 1.0));
    mesh_node.set_color(0.5, 0.3, 0.0);

    let rot = UnitQuaternion::from_axis_angle(&Vector3::y_axis(), 0.0014);

    while window.render() {
        // c.prepend_to_local_rotation(&rot);
    }
}