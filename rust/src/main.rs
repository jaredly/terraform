#![allow(dead_code, unused_imports)]
use gdal::raster::Dataset;
use std::path::Path;
// use gdal::raster::types::GdalType;
use gdal::raster::dataset::Buffer;

#[macro_use]
extern crate kiss3d;
extern crate geo;
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
use std::env;
fn noui() {
    let mut window = Window::new("Topo");
    window.set_light(Light::StickToCamera);
    let mut camera = kiss3d::camera::ArcBall::new(Point3::new(0.0, 0.0, 1.0), Point3::origin());
    camera.set_dist_step(1.0);
    window.set_camera(camera);

    let args: Vec<String> = env::args().collect();
    let (file_name, preselect) = match args.len() {
        2 => (args[1].as_str(), None),
        6 => (
            args[1].as_str(),
            Some((
                args[2].parse().unwrap(),
                args[3].parse().unwrap(),
                args[4].parse().unwrap(),
                args[5].parse().unwrap(),
            )),
        ),
        _ => (
            "../raw_data/USGS_NED_13_n41w112_ArcGrid_timp/grdn41w112_13",
            None,
        ),
    };

    let dataset = Dataset::open(Path::new(file_name)).unwrap();
    let file = profile!("Load file", terrain::File::from(&dataset));
    if cfg!(target_endian = "little") {
        println!("Ok")
    } else {
        panic!("At the disco")
    }
    if let Some((x, y, w, h)) = preselect {
        let coords = terrain::Coords { x, y, w, h };
        match file.to_stl(&coords, 1, 1.0) {
            None => println!("Failed to get stl"),
            Some(stl) => {
                let mut outfile = std::fs::File::create("./out.stl").unwrap();
                profile!("Writing file", stl::write_stl3(&mut outfile, &stl).unwrap());
                let mut outfile = std::fs::File::create("./out2.stl").unwrap();
                profile!("Writing file", stl::write_stl2(&mut outfile, &stl).unwrap());
            }
        }
        return;
    }
    let mut mesh = profile!("Make mesh", file.full_mesh(5, 2.0));

    let mut mesh_parent = window.add_group();

    let mut mesh_node = mesh_parent.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
    mesh_node.set_color(0.0, 1.0, 0.0);
    mesh_node.enable_backface_culling(false);

    fn select(
        file: &terrain::File,
        parent: &mut kiss3d::scene::SceneNode,
        coords: terrain::Coords,
        sample: usize,
    ) -> Option<kiss3d::scene::SceneNode> {
        println!(
            "Coords: {},{} - {} x {}",
            coords.x, coords.y, coords.w, coords.h
        );
        // None
        file.get_mesh(&coords, sample, 1.0).map(|mesh| {
            let mut mesh_node = parent.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
            mesh_node.set_color(0.0, 1.0, 0.0);
            mesh_node.enable_backface_culling(false);
            mesh_node
        })
    }

    let mut pointer = window.add_cube(0.002, 0.002, 0.5);
    pointer.set_color(1.0, 0.0, 0.0);
    pointer.set_visible(false);

    let mut selection = window.add_trimesh(make_selection(), Vector3::from_element(1.0));
    selection.set_local_scale(0.5, 0.5, 0.15);
    selection.enable_backface_culling(false);
    selection.set_color(0.0, 0.0, 1.0);
    selection.set_alpha(0.5);

    let mut size = Vector2::new(500.0, 500.0);
    let mut selpos = (Point2::new(-0.5, -0.5), Vector2::new(1.0, 1.0));
    let mut cursor = Point2::new(0.0, 0.0);
    let mut pressing = false;
    let mut selected_info = None;

    while window.render() {
        let mut manager = window.events();
        for mut event in manager.iter() {
            match event.value {
                WindowEvent::FramebufferSize(x, y) => size = Vector2::new(x as f32, y as f32),
                WindowEvent::MouseButton(MouseButton::Button1, action, modifiers) => {
                    if modifiers.contains(Modifiers::Super) {
                        match action {
                            Action::Release => {
                                pressing = false;
                                println!("Finished");
                                pointer.set_visible(false);
                            }
                            Action::Press => {
                                pressing = true;
                                println!("Super down {}, {}", cursor.x, cursor.y);
                                selpos.0 = cursor;
                                selpos.1 = Vector2::new(0.0, 0.0);
                            }
                        }
                        event.inhibited = true;
                    }
                }
                WindowEvent::Key(Key::LWin, Action::Release, _)
                | WindowEvent::Key(Key::RWin, Action::Release, _) => {
                    pointer.set_visible(false);
                }
                WindowEvent::Key(Key::Return, Action::Press, _) => {
                    match selected_info {
                        None => println!("No selection yet"),
                        Some((coords, sample)) => match file.to_stl(&coords, sample, 1.0) {
                            None => println!("Failed to get stl"),
                            Some(stl) => {
                                let mut outfile = std::fs::File::create("./out.stl").unwrap();
                                stl::write_stl(&mut outfile, &stl);
                            }
                        },
                    }
                    // Export maybe?
                    // mesh_node
                }
                WindowEvent::Key(Key::LWin, Action::Press, _)
                | WindowEvent::Key(Key::RWin, Action::Press, _) => {
                    pointer.set_visible(true);
                }
                WindowEvent::Key(Key::Space, Action::Press, _) => {
                    println!("ok");
                    let x = ((selpos.0.x + 0.5) * file.size.x as f32) as usize;
                    let y = ((selpos.0.y + 0.5) * file.size.y as f32) as usize;
                    let w = (selpos.1.x) * file.size.x as f32;
                    let h = (selpos.1.y) * file.size.y as f32;
                    let (x, w) = if w < 0.0 {
                        (x - (-w) as usize, (-w) as usize)
                    } else {
                        (x, w as usize)
                    };
                    let (y, h) = if h < 0.0 {
                        (y - (-h) as usize, (-h) as usize)
                    } else {
                        (y, h as usize)
                    };
                    let y = file.size.y - (y + h);
                    let total = w * h;
                    let max_points = 10_000_000;
                    let sample = if total <= max_points {
                        1
                    } else {
                        (total as f32 / max_points as f32).sqrt().ceil() as usize
                    };
                    println!("Selected sample size: {}", sample);
                    match select(
                        &file,
                        &mut mesh_parent,
                        terrain::Coords { x, y, w, h },
                        sample,
                    ) {
                        None => (),
                        Some(new_node) => {
                            selected_info = Some((terrain::Coords { x, y, w, h }, sample));
                            println!("To run the extraction from the cli: 
                            cargo run --release {} {} {} {} {}", file_name, x, y, w, h);
                            mesh_node.unlink();
                            mesh_node = new_node;
                            selection.set_local_scale(0.0, 0.0, 0.15);
                            let mut camera = kiss3d::camera::ArcBall::new(
                                Point3::new(0.0, 0.0, 1.0),
                                Point3::origin(),
                            );
                            camera.set_dist_step(1.0);
                            window.set_camera(camera);
                        }
                    }
                }
                WindowEvent::CursorPos(x, y, modifiers) => {
                    if modifiers.contains(Modifiers::Super) {
                        get_unprojected_coords(&Point2::new(x as f32, y as f32), &size, &window)
                            .map(|point| {
                                cursor = point;
                                pointer.set_local_translation(Translation3::from(Vector3::new(
                                    point.x, point.y, 0.0,
                                )));
                                event.inhibited = true;
                                if pressing {
                                    selpos.1 = cursor - selpos.0;
                                    selection.set_local_scale(
                                        selpos.1.x / 2.0,
                                        selpos.1.y / 2.0,
                                        0.15,
                                    );
                                    selection.set_local_translation(Translation3::from(
                                        Vector3::new(
                                            selpos.0.x + selpos.1.x / 2.0,
                                            selpos.0.y + selpos.1.y / 2.0,
                                            0.0,
                                        ),
                                    ));
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
