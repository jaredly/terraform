#![ allow( dead_code, unused_imports ) ]
use gdal::raster::Dataset;
use std::path::Path;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;


#[macro_use]
extern crate kiss3d;
extern crate nalgebra as na;

use kiss3d::event::{Action, Key, Modifiers, MouseButton, WindowEvent};
use kiss3d::light::Light;
use kiss3d::resource::{IndexNum, Mesh};
use kiss3d::window::Window;
use na::{Point2, Point3, Rotation3, Translation3, UnitQuaternion, Vector2, Vector3};
use ncollide3d::procedural::{IndexBuffer, TriMesh};
use std::time::SystemTime;

#[macro_use]
mod profile;
mod terrain;

fn make_selection() -> TriMesh<f32> {
    TriMesh::new(
        vec![
            Point3::new(-1.0, -1.0, -1.0), // 0 bl
            Point3::new(1.0, -1.0, -1.0),  // 1 br
            Point3::new(1.0, 1.0, -1.0),   // 2 tr
            Point3::new(-1.0, 1.0, -1.0),  // 3 tl
            Point3::new(-1.0, 1.0, 1.0),   // 4 tl
            Point3::new(1.0, 1.0, 1.0),    // 5 tr
            Point3::new(1.0, -1.0, 1.0),   // 6 br
            Point3::new(-1.0, -1.0, 1.0),  // 7 bl
        ],
        None,
        None,
        Some(IndexBuffer::Unified(vec![
            // top face
            Point3::new(3, 2, 4),
            Point3::new(2, 5, 4),
            // left face
            Point3::new(0, 3, 7),
            Point3::new(3, 4, 7),
            // right face
            Point3::new(1, 2, 6),
            Point3::new(2, 5, 6),
            // bottom face
            Point3::new(0, 1, 7),
            Point3::new(1, 6, 7),
        ])),
    )
}

use ncollide3d::query::ray_internal::ray::RayCast;
fn noui() {
    let mut window = Window::new("Topo");
    window.set_light(Light::StickToCamera);
    let mut camera = kiss3d::camera::ArcBall::new(Point3::new(0.0, 0.0, 1.0), Point3::origin());
    camera.set_dist_step(1.0);
    window.set_camera(camera);

    let dataset = Dataset::open(Path::new(
        "../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13",
    ))
    .unwrap();
    let file = profile!("Load file", terrain::File::from(&dataset));
    let mesh = profile!("Make mesh", file.full_mesh(10));

    // let mesh = profile!("Load file", terrain::load_file(&dataset, 10));
    let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
    mesh_node.set_color(0.0, 1.0, 0.0);
    mesh_node.enable_backface_culling(false);

    let mut pointer = window.add_cube(0.002, 0.002, 0.5);
    pointer.set_color(1.0, 0.0, 0.0);

    let mut selection = window.add_trimesh(make_selection(), Vector3::from_element(1.0));
    selection.set_local_scale(0.5, 0.5, 0.15);
    selection.enable_backface_culling(false);
    selection.set_color(0.0, 0.0, 1.0);
    selection.set_alpha(0.5);

    let mut size = (500.0, 500.0);
    let mut selpos = (-0.5, -0.5, 1.0, 1.0);
    let mut cursor = Point2::new(0.0, 0.0);
    let mut pressing = false;

    while window.render() {
        let mut manager = window.events();
        for mut event in manager.iter() {
            match event.value {
                WindowEvent::FramebufferSize(x, y) => {
                    size = (x as f32, y as f32);
                }
                WindowEvent::MouseButton(MouseButton::Button1, action, modifiers) => {
                    if modifiers.contains(Modifiers::Super) {
                        match action {
                            Action::Release => {
                                pressing = false;
                                println!("Finished");
                            }
                            Action::Press => {
                                pressing = true;
                                println!("Super down {}, {}", cursor.x, cursor.y);
                                selpos.0 = cursor.x;
                                selpos.1 = cursor.y;
                                selpos.2 = 0.0;
                                selpos.3 = 0.0;
                            }
                        }
                        event.inhibited = true;
                    }
                    // println!("Super!")
                }
                WindowEvent::CursorPos(x, y, modifiers) => {
                    if modifiers.contains(Modifiers::Super) {
                        get_unprojected_coords(
                            &Point2::new(x as f32, y as f32),
                            &Vector2::new(size.0, size.1),
                            &window,
                        )
                        .map(|point| {
                            cursor = point;
                            pointer.set_local_translation(Translation3::from(Vector3::new(
                                point.x as f32,
                                point.y as f32,
                                0.0,
                            )));
                            event.inhibited = true;
                            if pressing {
                                selpos.2 = cursor.x - selpos.0;
                                selpos.3 = cursor.y - selpos.1;
                                selection.set_local_scale(selpos.2 / 2.0, selpos.3 / 2.0, 0.15);
                                selection.set_local_translation(Translation3::from(Vector3::new(
                                    selpos.0 + selpos.2 / 2.0,
                                    selpos.1 + selpos.3 / 2.0,
                                    0.0,
                                )));
                            }
                        });
                    }
                }
                _ => (),
            }
        }
    }
}

fn get_unprojected_coords(
    point: &Point2<f32>,
    size: &Vector2<f32>,
    window: &Window,
) -> Option<Point2<f32>> {
    let (point, dir) = window.unproject(point, size);
    let ray = ncollide3d::query::Ray::new(point, dir);
    let v: na::Unit<Vector3<f32>> = na::Unit::new_normalize(Vector3::new(0.0, 0.0, 1.0));
    let plane = ncollide3d::shape::Plane::new(v);
    let toi = plane.toi_with_ray(&nalgebra::geometry::Isometry::identity(), &ray, true);

    match toi {
        Some(t) => {
            let point = ray.point_at(t);
            Some(Point2::new(point.x, point.y))
        }
        None => None,
    }
}

mod ui;

fn main() {
    // ui::main();
    noui();
}
