use std::path::Path;
use gdal::raster::Dataset;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;

#[macro_use]
extern crate kiss3d;
extern crate nalgebra as na;

use na::{Vector3, UnitQuaternion, Point3, Rotation3, Translation3};
use kiss3d::window::Window;
use kiss3d::light::Light;
use kiss3d::resource::{Mesh, IndexNum};
use kiss3d::event::{WindowEvent, Modifiers, Key, Action, MouseButton};
use std::time::SystemTime;

#[macro_use]
mod profile;
mod terrain;

fn noui() {
    let mut window = Window::new("Topo");
    window.set_light(Light::StickToCamera);
    let mut camera = kiss3d::camera::ArcBall::new(
        Point3::new(0.0, 0.0, 1.0),
        Point3::origin()
    );
    camera.set_dist_step(1.0);
    // camera.set_local_rotation(
    // UnitQuaternion::from_rotation_matrix(
    //     &Rotation3::from_axis_angle(
    //         &Vector3::z_axis(),
    //         3.14159 / 2.0
    //     )
    // )
    // )
    window.set_camera(camera);

    let dataset = Dataset::open(Path::new("../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13")).unwrap();
    let mesh = profile!("Load file", terrain::load_file(&dataset, 20));
    let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
    // mesh_node.set_color(0.5, 0.3, 0.0);
    mesh_node.set_color(0.0, 1.0, 0.0);
    // mesh_node.enable_backface_culling(false);

    // let mut c      = window.add_cube(0.1, 0.1, 0.1);
    // c.set_color(1.0, 0.0, 1.0);
    let mut pointer = window.add_cube(0.01, 0.01, 0.5);
    pointer.set_color(1.0, 0.0, 0.0);

    let mut c = window.add_quad(0.5, 0.5, 1, 1);
    c.set_color(0.0, 0.0, 1.0);
    c.set_local_rotation(UnitQuaternion::from_rotation_matrix(
        &Rotation3::from_axis_angle(
            &Vector3::y_axis(),
            3.14159 / 2.0
        )
    ));
    c.set_alpha(0.5);
    c.set_local_translation(Translation3::from_vector(Vector3::new(
        0.25, 0.0, 0.0
    )));

    let rot = UnitQuaternion::from_axis_angle(&Vector3::y_axis(), 0.0014);

    let mut size = (500.0, 500.0);

    while window.render() {
        let mut manager = window.events();
        for mut event in manager.iter() {
            match (event.value) {
                WindowEvent::FramebufferSize(x, y) => {
                    size = (x as f32, y as f32);
                },
                WindowEvent::MouseButton(MouseButton::Button1, action, modifiers) => {
                    if modifiers.contains(Modifiers::Super) {
                        match action {
                            Press => println!("Super down"),
                            Release => println!("Super up")
                        }
                    }
                    // println!("Super!")
                },
                WindowEvent::CursorPos(x, y, modifiers) => {
                    if modifiers.contains(Modifiers::Super) {
                        let ax = x as f32 * 1.0 / size.0 - 0.5;
                        let ay = y as f32 * 1.0/ size.1 - 0.5;
                        pointer.set_local_translation(Translation3::from(Vector3::new(
                            ax as f32, -ay as f32, 0.0
                        )));
                        event.inhibited = true;
                    }
                },
                _ => ()
            }
        }
        // for event in window.events() {
        //   do something?
        // }
        // c.prepend_to_local_rotation(&rot);
    }
}

mod ui;

fn main() {
    // ui::main();
    noui();
}