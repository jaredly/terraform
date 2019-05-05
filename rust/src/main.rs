use std::path::Path;
use gdal::raster::Dataset;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;

#[macro_use]
extern crate kiss3d;
extern crate nalgebra as na;

use na::{Vector3, UnitQuaternion, Point3};
use kiss3d::window::Window;
use kiss3d::light::Light;
use kiss3d::resource::{Mesh, IndexNum};
use std::time::SystemTime;

// use ui;

// fn profile<Output: Sized>(func: Fn() -> Output) -> Output {
//     let now = SystemTime::now();
//     let result = func();
//     result
// }

#[macro_use]
mod profile;
mod terrain;

fn noui() {
    let mut window = Window::new("Topo");
    window.set_light(Light::StickToCamera);
    let mut camera = kiss3d::camera::ArcBall::new(
        Point3::new(0.0, 0.0, -1.0),
        Point3::origin()
    );
    camera.set_dist_step(1.0);
    window.set_camera(camera);

    // let mut c      = window.add_cube(0.1, 0.1, 0.1);
    // c.set_color(1.0, 0.0, 1.0);

    let dataset = Dataset::open(Path::new("../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13")).unwrap();

    let mesh = profile!("Load file", terrain::load_file(&dataset, 10));

    let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
    mesh_node.set_color(0.5, 0.3, 0.0);
    mesh_node.enable_backface_culling(false);

    let rot = UnitQuaternion::from_axis_angle(&Vector3::y_axis(), 0.0014);

    while window.render() {
        // c.prepend_to_local_rotation(&rot);
    }
}

mod ui;

fn main() {
    ui::main();
    // noui();
}