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

mod threed;

extern crate nfd;

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

struct Selection {
    pos: Point2<f32>,
    size: Vector2<f32>,
}

enum Status {
    Initial,
    Large {
        file: terrain::File,
        pointer: kiss3d::scene::SceneNode,
        selection_node: kiss3d::scene::SceneNode,
        selection: Selection,
    },
    Small {
        file: terrain::File,
        coords: terrain::Coords,
        sample: usize,
    },
}

enum Transition {
    Open(String),
    Select(terrain::Coords, usize),
    Export
}

fn make_large(window: &mut Window, file_name: String) -> Status {
    window.scene_mut().clear();
    window.set_camera(make_camera());
    if let Ok(dataset) = Dataset::open(Path::new(file_name.as_str())) {
        let file = profile!("Load file", terrain::File::from(&dataset));
        let mesh = profile!("Make mesh", file.full_mesh(5, 2.0));
        let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
        mesh_node.set_color(0.0, 1.0, 0.0);
        mesh_node.enable_backface_culling(false);

        let mut pointer = window.add_cube(0.002, 0.002, 0.5);
        pointer.set_color(1.0, 0.0, 0.0);
        pointer.set_visible(false);

        let mut selection =
            window.add_trimesh(threed::make_selection(), Vector3::from_element(1.0));
        selection.set_local_scale(0.0, 0.0, 0.15);
        selection.enable_backface_culling(false);
        selection.set_color(0.0, 0.0, 1.0);
        selection.set_alpha(0.5);

        Status::Large {
            file,
            pointer,
            selection_node: selection,
            selection: Selection {
                pos: Point2::new(0.0, 0.0),
                size: Vector2::new(0.0, 0.0),
            },
        }
    } else {
        Status::Initial
    }
}

fn handle_transition(window: &mut Window, current: Status, transition: Transition) -> Status {
    match (current, transition) {
        (_, Transition::Open(file_name)) => make_large(window, file_name),
        (
            Status::Large {
                file,
                pointer,
                selection,
                selection_node,
            },
            Transition::Select(coords, sample),
        ) => {
            if let Some(mesh) = file.get_mesh(&coords, sample, 1.0) {
                window.scene_mut().clear();
                window.set_camera(make_camera());

                let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
                mesh_node.set_color(0.0, 1.0, 0.0);
                mesh_node.enable_backface_culling(false);

                Status::Small {
                    file,
                    coords,
                    sample,
                }
            } else {
                Status::Large {
                    file,
                    pointer,
                    selection,
                    selection_node,
                }
            }
        }
        (Status::Small { file, coords, sample }, Transition::Export) => {
            match file.to_stl(&coords, sample, 1.0) {
                None => println!("Failed to get stl"),
                Some(stl) => {
                    if let Ok(nfd::Response::Okay(file_path)) = nfd::open_save_dialog(None, None) {
                        let mut outfile = std::fs::File::create(file_path.as_str()).unwrap();
                        profile!("Write file", stl::write_stl(&mut outfile, &stl));
                    } else {
                        println!("No file selected. Exiting");
                    }
                }
            };
            Status::Small { file, coords, sample }

        }
        (status, _) => status,
    }
}

fn make_camera() -> kiss3d::camera::ArcBall {
    let mut camera = kiss3d::camera::ArcBall::new(Point3::new(0.0, 0.0, 1.0), Point3::origin());
    camera.set_dist_step(1.0);
    camera
}

fn calc_coords(size: Vector2<usize>, selpos: (Point2<f32>, Vector2<f32>)) -> terrain::Coords {
    let x = ((selpos.0.x + 0.5) * size.x as f32) as usize;
    let y = ((selpos.0.y + 0.5) * size.y as f32) as usize;
    let w = (selpos.1.x) * size.x as f32;
    let h = (selpos.1.y) * size.y as f32;
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
    let y = size.y - (y + h);
    terrain::Coords { x, y, w, h }
}

fn make_window() -> Window {
    let mut window = Window::new("Terraform");
    window.set_light(Light::StickToCamera);
    window.set_camera(make_camera());
    window
}

struct State {
    // window_size: Vector2<f32>,
    // selection: Selection,
    // cursor: Point2<f32>,
    // pressing: bool,
    window: Window,
    status: Status,
}

impl Status {
    fn ui(&mut self, ui: &mut kiss3d::conrod::UiCell, ids: &Ids) -> Option<Transition> {
        use kiss3d::conrod::{widget, Colorable, Labelable, Positionable, Sizeable, Widget};
        use std::iter::once;

        const MARGIN: conrod::Scalar = 30.0;
        const SHAPE_GAP: conrod::Scalar = 50.0;
        const TITLE_SIZE: conrod::FontSize = 42;
        const SUBTITLE_SIZE: conrod::FontSize = 32;

        widget::Canvas::new()
            .pad(MARGIN)
            .align_top()
            .h(100.0)
            // .scroll_kids_vertically()
            .set(ids.canvas, ui);


        match self {
            Status::Initial => {
                widget::List::flow_right(2)
                    .set(ids.hlist, ui);

                widget::Text::new("No file loaded")
                    // .padded_w_of(ids.canvas, MARGIN)
                    // .down(60.0)
                    // .align_middle_x_of(ids.canvas)
                    .center_justify()
                    // .line_spacing(5.0)
                    .set(ids.introduction, ui);

                for _press in widget::Button::new()
                    .label("Open File")
                    .mid_left_with_margin_on(ids.hlist, MARGIN)
                    // .down_from(ids.button_title, 60.0)
                    // .w_h(side, side)
                    .set(ids.button, ui)
                {
                    match nfd::open_file_dialog(None, None) {
                        Ok(nfd::Response::Okay(file_path)) => {
                            return Some(Transition::Open(file_path))
                        }
                        _ => (),
                    }
                }
                return None
            }
            _ => None
        }

    }

    fn handle_event(
        &mut self,
        window: &mut Window,
        event: &mut kiss3d::event::Event,
    ) -> Option<Transition> {
        match event.value {
            WindowEvent::Key(Key::LWin, Action::Release, _)
            | WindowEvent::Key(Key::RWin, Action::Release, _) => {
                match self {
                    Status::Large { pointer, .. } => pointer.set_visible(false),
                    _ => (),
                };
                None
            }
            WindowEvent::Key(Key::LWin, Action::Press, _)
            | WindowEvent::Key(Key::RWin, Action::Press, _) => {
                match self {
                    Status::Large { pointer, .. } => pointer.set_visible(true),
                    _ => (),
                };
                None
            }

            WindowEvent::Key(Key::O, Action::Press, _) => match self {
                Status::Initial => match nfd::open_file_dialog(None, None) {
                    Ok(nfd::Response::Okay(file_path)) => Some(Transition::Open(file_path)),
                    _ => None,
                },
                _ => None,
            },

            WindowEvent::Key(Key::Return, Action::Press, _) => {
                Some(Transition::Export)
                // match self {
                //     Status::Small {
                //         file,
                //         coords,
                //         sample,
                //     } =>
                //     _ => (),
                // };
                // None
            }

            WindowEvent::Key(Key::Space, Action::Press, _) => match self {
                Status::Large {
                    file,
                    pointer,
                    selection,
                    selection_node,
                } => {
                    println!("ok");
                    let coords = calc_coords(file.size, (selection.pos, selection.size));
                    let total = coords.w * coords.h;
                    let max_points = 10_000_000;
                    let sample = if total <= max_points {
                        1
                    } else {
                        (total as f32 / max_points as f32).sqrt().ceil() as usize
                    };
                    Some(Transition::Select(coords, sample))
                }
                _ => None,
            },

            WindowEvent::MouseButton(MouseButton::Button1, Action::Press, modifiers)
                if modifiers.contains(Modifiers::Super) =>
            {
                match self {
                    Status::Large { selection, .. } => {
                        let (w, h) = window.canvas().size();
                        if let Some((x, y)) = window.canvas().cursor_pos() {
                            // println!("Super down {}, {}", cursor.x, cursor.y);
                            if let Some(point) = threed::get_unprojected_coords(
                                &Point2::new(x as f32, y as f32),
                                &Vector2::new(w as f32, h as f32),
                                &window,
                            ) {
                                selection.pos = point;
                                selection.size = Vector2::new(0.0, 0.0);
                            }
                        }
                    }
                    _ => (),
                }
                event.inhibited = true;
                None
            }

            WindowEvent::CursorPos(x, y, modifiers) => {
                match self {
                    Status::Large {
                        file,
                        pointer,
                        selection,
                        selection_node,
                    } => {
                        if modifiers.contains(Modifiers::Super) {
                            let (w, h) = window.canvas().size();
                            threed::get_unprojected_coords(
                                &Point2::new(x as f32, y as f32),
                                &Vector2::new(w as f32, h as f32),
                                &window,
                            )
                            .map(|point| {
                                // cursor = point;
                                pointer.set_local_translation(Translation3::from(Vector3::new(
                                    point.x, point.y, 0.0,
                                )));
                                event.inhibited = true;
                                if window
                                    .canvas()
                                    .get_mouse_button(kiss3d::event::MouseButton::Button1)
                                    == Action::Press
                                {
                                    // selection.pos = point;
                                    selection.size = point - selection.pos;
                                    selection_node.set_local_scale(
                                        selection.size.x / 2.0,
                                        selection.size.y / 2.0,
                                        0.15,
                                    );
                                    selection_node.set_local_translation(Translation3::from(
                                        Vector3::new(
                                            selection.pos.x + selection.size.x / 2.0,
                                            selection.pos.y + selection.size.y / 2.0,
                                            0.0,
                                        ),
                                    ));
                                }
                            });
                        }
                    }
                    _ => (),
                };
                None
            }

            _ => None,
        }
    }
}

impl State {
    fn new() -> Self {
        State {
            window: make_window(),
            status: Status::Initial,
        }
    }

    fn transition(&mut self, transition: Transition) {
        self.status = handle_transition(
            &mut self.window,
            std::mem::replace(&mut self.status, Status::Initial),
            transition,
        );
    }

    fn handle_event(&mut self, event: &mut kiss3d::event::Event) {
        match self.status.handle_event(&mut self.window, event) {
            None => (),
            Some(transition) => {
                self.transition(transition);
            }
        }
    }

    fn run(&mut self) {
        while self.window.render() {
            let mut manager = self.window.events();
            for mut event in manager.iter() {
                self.handle_event(&mut event)
            }
        }
    }
}

fn someui(file_name: Option<String>) {
    let mut state = State::new();
    match file_name {
        None => (),
        Some(file_name) => state.transition(Transition::Open(file_name)),
    }
    state.run();
}

fn main() {
    use std::env;
    let args: Vec<String> = env::args().collect();
    match args.len() {
        2 => someui(Some(args[1].clone())),
        6 => {
            let dataset = Dataset::open(Path::new(args[1].as_str())).unwrap();
            let file = profile!("Load file", terrain::File::from(&dataset));
            let coords = terrain::Coords {
                x: args[2].parse().unwrap(),
                y: args[3].parse().unwrap(),
                w: args[4].parse().unwrap(),
                h: args[5].parse().unwrap(),
            };
            match file.to_stl(&coords, 1, 1.0) {
                None => println!("Failed to get stl"),
                Some(stl) => {
                    let mut outfile = std::fs::File::create("./out.stl").unwrap();
                    profile!("Writing file", stl::write_stl(&mut outfile, &stl).unwrap());
                }
            }
        }
        _ => someui(None),
    };
    // let (file_name, preselect) =
}
