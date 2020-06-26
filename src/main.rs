#![allow(dead_code, unused_imports)]
use gdal::raster::dataset::Buffer;
use gdal::raster::Dataset;
use std::path::Path;

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
use std::fs::File;
use std::io::prelude::*;

mod hex;

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

struct Zoom {
    coords: terrain::Coords,
    hselection: (Point2<f32>, f32),
    sample: usize,
    cut: Option<terrain::Hex>,
}

struct Status {
    file: terrain::File,
    pointer: kiss3d::scene::SceneNode,
    selection_node: kiss3d::scene::SceneNode,
    selection: Selection,
    zoom: Option<Zoom>,
}

enum Transition {
    Open(String),
    Select(terrain::Coords, usize),
    Resolution(usize),
    Export,
    ExportJSON,
    Reset,
    Cut(terrain::Hex),
}

use kiss3d::scene::SceneNode;

fn large_nodes(file: &terrain::File, window: &mut Window) -> (SceneNode, SceneNode) {
    window.scene_mut().clear();
    window.set_camera(make_camera());

    let mesh = profile!("Make mesh", file.full_mesh(10, 2.0));
    let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
    mesh_node.set_color(0.0, 1.0, 0.0);
    mesh_node.enable_backface_culling(false);

    let mut pointer = window.add_cube(0.002, 0.002, 0.5);
    pointer.set_color(1.0, 0.0, 0.0);
    // pointer.set_visible(false);

    let mut selection = window.add_trimesh(threed::make_selection(), Vector3::from_element(1.0));
    selection.set_local_scale(0.0, 0.0, 0.15);
    selection.enable_backface_culling(false);
    selection.set_color(0.0, 0.0, 1.0);
    selection.set_alpha(0.5);

    (pointer, selection)
}

fn make_large(window: &mut Window, file_name: String) -> Option<Status> {
    if let Ok(dataset) = Dataset::open(Path::new(file_name.as_str())) {
        let file = profile!(
            "Load file",
            terrain::File::from_dataset(&dataset, file_name)
        );

        let (pointer, selection) = large_nodes(&file, window);

        Some(Status {
            file,
            pointer,
            selection_node: selection,
            selection: Selection {
                pos: Point2::new(0.0, 0.0),
                size: Vector2::new(0.0, 0.0),
            },
            zoom: None,
        })
    } else {
        println!("Reset");
        None
    }
}

fn setup_cut(
    window: &mut Window,
    file: &terrain::File,
    hex: &terrain::Hex,
    sample: usize,
    reset_camera: bool,
) -> bool {
    if let Some(mesh) = file.get_hex(&hex, sample) {
        window.scene_mut().clear();
        if reset_camera {
            window.set_camera(make_camera());
        }

        let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
        mesh_node.set_color(0.0, 1.0, 0.0);
        mesh_node.enable_backface_culling(false);
        // TODO expose this as a setting? Or a toggle, more likely
        // mesh_node.set_lines_width(0.1);
        // mesh_node.set_surface_rendering_activation(false);

        true
    } else {
        false
    }
}

fn setup_small(
    window: &mut Window,
    file: &terrain::File,
    coords: &terrain::Coords,
    sample: usize,
    reset_camera: bool,
) -> Option<(kiss3d::scene::SceneNode, kiss3d::scene::SceneNode)> {
    if let Some(mesh) = file.get_mesh(&coords, sample, 1.0) {
        window.scene_mut().clear();
        if reset_camera {
            window.set_camera(make_camera());
        }

        let mut mesh_node = window.add_mesh(mesh, Vector3::new(1.0, 1.0, 1.0));
        mesh_node.set_color(0.0, 1.0, 0.0);
        mesh_node.enable_backface_culling(false);

        let mut pointer = window.add_cube(0.002, 0.002, 0.5);
        pointer.set_color(1.0, 0.0, 0.0);
        // pointer.set_visible(false);

        let mut selection = window.add_trimesh(threed::make_hex(), Vector3::from_element(1.0));
        selection.set_local_scale(0.0, 0.0, 0.15);
        selection.enable_backface_culling(false);
        selection.set_color(0.0, 0.0, 1.0);
        selection.set_alpha(0.5);

        Some((pointer, selection))
    } else {
        None
    }
}

fn handle_transition(
    window: &mut Window,
    current: Option<Status>,
    transition: Transition,
) -> Option<Status> {
    match current {
        None => match transition {
            Transition::Open(file_name) => match make_large(window, file_name) {
                Some(status) => Some(status),
                None => None,
            },
            _ => None,
        },
        Some(status) => {
            match transition {
                Transition::Open(file_name) => match make_large(window, file_name) {
                    Some(status) => Some(status),
                    None => Some(status),
                },
                Transition::Select(coords, sample) => {
                    if let Some((pointer, selection_node)) =
                        setup_small(window, &status.file, &coords, sample, true)
                    {
                        Some(Status {
                            pointer,
                            selection_node,
                            zoom: Some(Zoom {
                                coords,
                                sample,
                                hselection: (Point2::new(0.0, 0.0), 0.0),
                                cut: None,
                            }),
                            ..status
                        })
                    } else {
                        Some(status)
                    }
                }
                Transition::Cut(hex) => match status.zoom {
                    None => Some(status),
                    Some(zoom) => {
                        println!("To re-run at this setting: \n cargo run --release {} {} {} {} {} {} {} {}", status.file.name, zoom.coords.x, zoom.coords.y, zoom.coords.w, zoom.coords.h, hex.cx, hex.cy, hex.half_height);
                        setup_cut(window, &status.file, &hex, zoom.sample, true);
                        Some(Status {
                            zoom: Some(Zoom {
                                cut: Some(hex),
                                ..zoom
                            }),
                            ..status
                        })
                    }
                },
                Transition::Resolution(res) => match status.zoom {
                    None => Some(status),
                    Some(zoom) => match zoom.cut {
                        Some(cut) => {
                            setup_cut(window, &status.file, &cut, res, false);
                            Some(Status {
                                zoom: Some(Zoom {
                                    sample: res,
                                    cut: Some(cut),
                                    ..zoom
                                }),
                                ..status
                            })
                        }
                        None => Some(Status {
                            zoom: if let Some((mut p_new, mut sel_new)) =
                                setup_small(window, &status.file, &zoom.coords, res, false)
                            {
                                sel_new.unlink();
                                window.add_child(&status.selection_node);
                                p_new.unlink();
                                window.add_child(&status.pointer);
                                Some(Zoom {
                                    sample: res,
                                    ..zoom
                                })
                            } else {
                                Some(zoom)
                            },
                            ..status
                        }),
                    },
                },
                Transition::Reset => match status.zoom {
                    None => Some(status),
                    Some(zoom) => match zoom.cut {
                        None => {
                            let (pointer, selection_node) = large_nodes(&status.file, window);
                            Some(Status {
                                pointer,
                                selection_node,
                                selection: Selection {
                                    pos: Point2::new(0.0, 0.0),
                                    size: Vector2::new(0.0, 0.0),
                                },
                                zoom: None,
                                ..status
                            })
                        }
                        Some(_cut) => {
                            if let Some((pointer, selection_node)) =
                                setup_small(window, &status.file, &zoom.coords, zoom.sample, true)
                            {
                                Some(Status {
                                    zoom: Some(Zoom { cut: None, ..zoom }),
                                    pointer,
                                    selection_node,
                                    ..status
                                })
                            } else {
                                Some(Status {
                                    zoom: Some(zoom),
                                    ..status
                                })
                            }
                        }
                    },
                },
                Transition::ExportJSON => match status.zoom {
                    None => Some(status),
                    Some(zoom) => {
                        let json = status.file.get_json(&zoom.coords, zoom.sample, 1.0);

                        match json {
                            None => println!("Failed to get stl"),
                            Some(json) => {
                                if let Ok(nfd::Response::Okay(file_path)) =
                                    nfd::open_save_dialog(Some("js"), None)
                                {
                                    let mut outfile =
                                        std::fs::File::create(file_path.as_str()).unwrap();
                                    // let mut file = File::create("foo.txt")?;
                                    // file.write_all(b"Hello, world!")?;
                                    let data = format!(
                                        "window.data[\"{}\"] = {{x: {:2}, y: {:2}, rows: [[{}]]}}",
                                        file_path,
                                        &zoom.coords.x,
                                        &zoom.coords.y,
                                        json.iter().map(|row| row.iter().map(
                                            |item| item.to_string()
                                        ).collect::<Vec<String>>().join(",")).collect::<Vec<String>>().join("],\n[")
                                    );
                                    if profile!("Write file", outfile.write_all(
                                        data.as_bytes()
                                    )).is_err() {
                                        println!("Failed to write :'(");
                                    }
                                } else {
                                    println!("No file selected. Exiting");
                                }
                            }
                        }

                        Some(Status {
                            zoom: Some(zoom),
                            ..status
                        })
                    }
                },
                Transition::Export => match status.zoom {
                    None => Some(status),
                    Some(zoom) => {
                        let stl = match zoom.cut {
                            Some(cut) => status.file.to_hex_stl(&cut, zoom.sample),
                            None => status.file.to_stl(&zoom.coords, zoom.sample, 1.0),
                        };

                        match stl {
                            None => println!("Failed to get stl"),
                            Some(stl) => {
                                if let Ok(nfd::Response::Okay(file_path)) =
                                    nfd::open_save_dialog(Some("stl"), None)
                                {
                                    let mut outfile =
                                        std::fs::File::create(file_path.as_str()).unwrap();
                                    if profile!("Write file", stl::write_stl(&mut outfile, &stl)).is_err() {
                                        println!("Failed to write :'(");
                                    }
                                } else {
                                    println!("No file selected. Exiting");
                                }
                            }
                        }

                        Some(Status {
                            zoom: Some(zoom),
                            ..status
                        })
                    }
                },
            }
        }
    }
}

fn make_camera() -> kiss3d::camera::ArcBall {
    let mut camera = kiss3d::camera::ArcBall::new(Point3::new(0.0, 0.0, 1.5), Point3::origin());
    camera.set_dist_step(1.0);
    camera.set_drag_modifiers(Some(kiss3d::event::Modifiers::Shift));
    camera.rebind_drag_button(Some(kiss3d::event::MouseButton::Button1));
    camera.set_rotate_modifiers(Some(kiss3d::event::Modifiers::Control));
    camera
}

fn hselection_to_hex(coords: &terrain::Coords, selection: (Point2<f32>, f32)) -> terrain::Hex {
    let cx = ((selection.0.x + 0.5) * coords.w as f32) as usize;
    let cy = ((1.0 - (selection.0.y + 0.5)) * coords.h as f32) as usize;
    let r = selection.1 * (coords.w.max(coords.h) as f32);
    let half_height = (r / 2.0 * (3.0_f32).sqrt()) as usize;
    terrain::Hex::new(coords.x + cx, coords.y + cy, half_height)
}

fn normalize_selection(size: Vector2<usize>, selection: &Selection) -> terrain::Coords {
    let x = ((selection.pos.x + 0.5) * size.x as f32) as usize;
    let y = ((selection.pos.y + 0.5) * size.y as f32) as usize;
    let w = (selection.size.x) * size.x as f32;
    let h = (selection.size.y) * size.y as f32;
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
    window: Window,
    status: Option<Status>,
    ids: Ids,
}

use kiss3d::conrod;

/*
 *
 * This is he example taken from conrods' repository.
 *
 */
/// A set of reasonable stylistic defaults that works for the `gui` below.
pub fn theme() -> kiss3d::conrod::Theme {
    use kiss3d::conrod::position::{Align, Direction, Padding, Position, Relative};
    conrod::Theme {
        name: "Main Theme".to_string(),
        padding: Padding::none(),
        x_position: Position::Relative(Relative::Direction(Direction::Forwards, 10.0), None),
        y_position: Position::Relative(Relative::Align(Align::Middle), None),
        background_color: conrod::color::TRANSPARENT,
        // background_color: conrod::color::BLUE,
        shape_color: conrod::color::LIGHT_CHARCOAL,
        border_color: conrod::color::BLACK,
        border_width: 0.0,
        label_color: conrod::color::WHITE,
        font_id: None,
        font_size_large: 18,
        font_size_medium: 12,
        font_size_small: 8,
        widget_styling: conrod::theme::StyleMap::default(),
        mouse_drag_threshold: 0.0,
        double_click_threshold: std::time::Duration::from_millis(500),
    }
}

// Generate a unique `WidgetId` for each widget.
widget_ids! {
    pub struct Ids {
        // The scrollable canvas.
        canvas,
        top_canvas,
        bottom_canvas,
        hlist,
        status_text,
        open_file,
        help_text,
        selection_text,
        crop,
        sample_text,
        sample_less,
        sample_greater,
        export,
        export_json,
        reset,
        cut,
        image
    }
}

trait Statusable {
    fn ui(
        &mut self,
        window_height: u32,
        ui: &mut kiss3d::conrod::UiCell,
        image: kiss3d::conrod::image::Id,
        ids: &Ids,
    ) -> Option<Transition>;

    fn handle_event(
        &mut self,
        window: &mut Window,
        event: &mut kiss3d::event::Event,
    ) -> Option<Transition>;
}

impl Statusable for Option<Status> {
    fn ui(
        &mut self,
        window_height: u32,
        ui: &mut kiss3d::conrod::UiCell,
        image: kiss3d::conrod::image::Id,
        ids: &Ids,
    ) -> Option<Transition> {
        use kiss3d::conrod;
        use kiss3d::conrod::{widget, Colorable, Labelable, Positionable, Sizeable, Widget};
        use std::iter::once;

        const MARGIN: conrod::Scalar = 10.0;
        const SHAPE_GAP: conrod::Scalar = 50.0;
        const TITLE_SIZE: conrod::FontSize = 42;
        const SUBTITLE_SIZE: conrod::FontSize = 32;
        const HEIGHT: conrod::Scalar = 20.0;

        widget::Canvas::new()
            .pad(MARGIN)
            .align_top()
            .h(40.0)
            .set(ids.top_canvas, ui);

        widget::Canvas::new()
            .pad(MARGIN)
            .align_bottom()
            .x(0.0)
            .y(-(f64::from(window_height)) / 2.0)
            // .y(-200.0)
            // .y(window_height as f64 - 400.0)
            // .y(100.0)
            .h(0.0)
            .set(ids.bottom_canvas, ui);

        match self {
            None => {
                widget::Canvas::new()
                    .pad(MARGIN)
                    // .align_bottom()
                    // .h(40.0)
                    .set(ids.canvas, ui);

                // widget::Canvas::new()
                //     .pad(MARGIN)
                //     // .align_top()
                //     // .h(40.0)
                //     .set(ids.canvas, ui);

                widget::Image::new(image)
                    .middle_of(ids.canvas)
                    .w_h(400.0, 400.0)
                    // .kid_area_wh_of(ids.canvas)
                    // .x(100.0)
                    // .y(-(window_height as f64) / 4.0 + 100.0)
                    .set(ids.image, ui);

                widget::Text::new("Terraform")
                    .up_from(ids.image, 20.0)
                    // .align_top()
                    // .y(0.0)
                    // .h(20.0)
                    .align_middle_x()
                    // .mid_top_of(ids.canvas)
                    // .align_left()
                    // .down_from(ids.canvas, 0.0)
                    // .down(50.0)
                    .font_size(64)
                    .set(ids.status_text, ui);

                if let Some(_press) = widget::Button::new()
                    .label("Open File")
                    .down_from(ids.image, 20.0)
                    .with_style(conrod::widget::button::Style {
                        label_font_size: Some(24),
                        ..conrod::widget::button::Style::default()
                    })
                    .align_middle_x()
                    .w(80.0 * 2.0)
                    .h(HEIGHT * 2.0)
                    .set(ids.open_file, ui).next() {
                    if let Ok(nfd::Response::Okay(file_path)) = nfd::open_file_dialog(Some("adf,tif"), None) {
                        return Some(Transition::Open(file_path))
                    }
                }

                None
            }
            Some(Status {
                file,
                selection,
                zoom: None,
                ..
            }) => {
                for _press in widget::Button::new()
                    .label("Open File")
                    .mid_left_of(ids.top_canvas)
                    .w(80.0)
                    .h(HEIGHT)
                    .set(ids.open_file, ui)
                {
                    if let Ok(nfd::Response::Okay(file_path)) = nfd::open_file_dialog(Some("adf,tif"), None) {
                        return Some(Transition::Open(file_path))
                    }
                }

                let name = file.name[0.max(file.name.len() - 20)..].to_string();
                let label_text = format!("File: {}", name);
                widget::Text::new(label_text.as_str())
                    .mid_left_of(ids.bottom_canvas)
                    .set(ids.status_text, ui);

                if selection.size.x != 0.0 && selection.size.y != 0.0 {
                    let coords = normalize_selection(file.size, selection);
                    let selected_text = format!(
                        " Selection: {:.3}, {:.3} - {:.3} x {:.3}",
                        coords.x, coords.y, coords.w, coords.h
                    );
                    widget::Text::new(selected_text.as_str())
                        .right_from(ids.status_text, 10.0)
                        .set(ids.selection_text, ui);

                    if let Some(_press) = widget::Button::new()
                        .label("Crop")
                        .right_from(ids.open_file, 10.0)
                        .h(HEIGHT)
                        .w(50.0)
                        .set(ids.crop, ui)
                        .next()
                    {
                        let total = coords.w * coords.h;
                        let max_points = 10_000_000;
                        let sample = if total <= max_points {
                            1
                        } else {
                            (total as f32 / max_points as f32).sqrt().ceil() as usize
                        };
                        return Some(Transition::Select(coords, sample));
                    }
                };

                widget::Text::new("Click & drag to select a crop region. Shift-click to pan & ctrl-click to rotate")
                    .down_from(ids.open_file, 10.0)
                    .set(ids.help_text, ui);

                None
            }
            Some(Status {
                file,
                zoom: Some(zoom),
                ..
            }) => {
                if let Some(_press) = widget::Button::new()
                    .label("Open File")
                    .mid_left_of(ids.top_canvas)
                    .w(80.0)
                    .h(HEIGHT)
                    .set(ids.open_file, ui)
                    .next()
                {
                    if let Ok(nfd::Response::Okay(file_path)) = nfd::open_file_dialog(Some("adf,tif"), None) {
                        return Some(Transition::Open(file_path))
                    }
                }

                let name = file.name[0.max(file.name.len() - 20)..].to_string();
                let label_text = format!("File: {}", name);
                widget::Text::new(label_text.as_str())
                    .mid_left_of(ids.bottom_canvas)
                    .set(ids.status_text, ui);

                let points = {
                    match zoom.cut {
                        None => {
                            if zoom.hselection.1 == 0.0 {
                                (zoom.coords.w / zoom.sample) * (zoom.coords.h / zoom.sample)
                            } else {
                                let hex = hselection_to_hex(&zoom.coords, zoom.hselection);
                                let height = hex.half_height * 2;
                                let width = (height as f32 / (3.0_f32).sqrt() * 2.0) as usize;
                                let count = height / zoom.sample * width / zoom.sample * 3 / 4;
                                count
                            }
                        }
                        Some(hex) => {
                            let height = hex.half_height * 2 / zoom.sample;
                            let width = (height as f32 / (3.0_f32).sqrt() * 2.0) as usize;
                            let count = height * width * 3 / 4;
                            let sides = height * 2 + width * 2;
                            count + sides
                        }
                    }
                };
                widget::Text::new(
                    format!(
                        "{} triangles, {}mb file size. Sample: {}",
                        points * 2,
                        // each "square" takes 100 bytes, 50 bytes per triangle
                        points * 100 / 1_048_576,
                        zoom.sample
                    )
                    .as_str(),
                )
                .right_from(ids.status_text, 10.0)
                .set(ids.sample_text, ui);

                if let Some(_press) = widget::Button::new()
                    .label("+ resolution")
                    .right_from(ids.open_file, 10.0)
                    .w(90.0)
                    .h(HEIGHT)
                    .enabled(zoom.sample > 1)
                    .set(ids.sample_less, ui)
                    .next()
                {
                    if zoom.sample > 1 {
                        return Some(Transition::Resolution(zoom.sample - 1));
                    }
                }

                if let Some(_press) = widget::Button::new()
                    .label("- resolution")
                    .right_from(ids.sample_less, 10.0)
                    .w(90.0)
                    .h(HEIGHT)
                    .enabled(zoom.sample < 100)
                    .set(ids.sample_greater, ui).next()
                {
                    if zoom.sample < 100 {
                        return Some(Transition::Resolution(zoom.sample + 1));
                    }
                }

                if let Some(_press) = widget::Button::new()
                    .label("Export")
                    .right_from(ids.sample_greater, 10.0)
                    .w(60.0)
                    .h(HEIGHT)
                    .set(ids.export, ui).next()
                {
                    return Some(Transition::Export);
                }

                if let Some(_press) = widget::Button::new()
                    .label("Export json")
                    .right_from(ids.export, 10.0)
                    .w(60.0)
                    .h(HEIGHT)
                    .set(ids.export_json, ui).next()
                {
                    return Some(Transition::ExportJSON);
                }

                if let Some(_press) = widget::Button::new()
                    .label("Back")
                    .right_from(ids.export_json, 10.0)
                    .w(60.0)
                    .h(HEIGHT)
                    .set(ids.reset, ui).next()
                {
                    return Some(Transition::Reset);
                }

                if zoom.hselection.1 != 0.0 && zoom.cut.is_none() {
                    if let Some(_press) = widget::Button::new()
                        .label("Cut")
                        .right_from(ids.reset, 10.0)
                        .w(30.0)
                        .h(HEIGHT)
                        .set(ids.cut, ui).next()
                    {
                        return Some(Transition::Cut(hselection_to_hex(
                            &zoom.coords,
                            zoom.hselection,
                        )));
                    }
                }

                if zoom.cut.is_none() {
                    widget::Text::new("Click & drag to select a hexagonal region for final cut")
                        .down_from(ids.open_file, 10.0)
                        .set(ids.help_text, ui);
                }

                widget::Text::new("Shift-click to pan & ctrl-click to rotate")
                    .down_from(ids.open_file, 10.0)
                    .set(ids.help_text, ui);

                None
            }
        }
    }

    fn handle_event(
        &mut self,
        window: &mut Window,
        event: &mut kiss3d::event::Event,
    ) -> Option<Transition> {
        match event.value {
            WindowEvent::MouseButton(MouseButton::Button1, Action::Press, modifiers)
                if modifiers.is_empty() =>
            {
                if let Some((_, y)) = window.canvas().cursor_pos() {
                    if y < 80.0 {
                        return None;
                    }
                }
                match self {
                    Some(Status {
                        zoom: Some(zoom), ..
                    }) => {
                        let (w, h) = window.canvas().size();
                        if let Some((x, y)) = window.canvas().cursor_pos() {
                            // println!("Super down {}, {}", cursor.x, cursor.y);
                            if let Some(point) = threed::get_unprojected_coords(
                                Point2::new(x as f32, y as f32),
                                Vector2::new(w as f32, h as f32),
                                &window,
                            ) {
                                zoom.hselection.0 = point;
                                zoom.hselection.1 = 0.0;
                            }
                        }
                    }
                    Some(Status {
                        zoom: None,
                        selection,
                        ..
                    }) => {
                        let (w, h) = window.canvas().size();
                        if let Some((x, y)) = window.canvas().cursor_pos() {
                            // println!("Super down {}, {}", cursor.x, cursor.y);
                            if let Some(point) = threed::get_unprojected_coords(
                                Point2::new(x as f32, y as f32),
                                Vector2::new(w as f32, h as f32),
                                &window,
                            ) {
                                selection.pos = point;
                                selection.size = Vector2::new(0.0, 0.0);
                            }
                        }
                    }
                    _ => (),
                }
                // event.inhibited = true;
                None
            }

            WindowEvent::CursorPos(x, y, modifiers) => {
                if y < 80.0 {
                    return None;
                }
                match self {
                    Some(Status {
                        pointer,
                        selection_node,
                        zoom: Some(Zoom { hselection, .. }),
                        ..
                    }) => {
                        let (w, h) = window.canvas().size();
                        if let Some(point) = threed::get_unprojected_coords(
                            Point2::new(x as f32, y as f32),
                            Vector2::new(w as f32, h as f32),
                            &window,
                        ) {
                            // cursor = point;
                            pointer.set_local_translation(Translation3::from(Vector3::new(
                                point.x, point.y, 0.0,
                            )));
                            // event.inhibited = true;
                            if window
                                .canvas()
                                .get_mouse_button(kiss3d::event::MouseButton::Button1)
                                == Action::Press
                                && modifiers.is_empty()
                            {
                                hselection.1 = (point - hselection.0).norm();
                                selection_node.set_local_scale(hselection.1, hselection.1, 0.15);
                                selection_node.set_local_translation(Translation3::from(
                                    Vector3::new(hselection.0.x, hselection.0.y, 0.0),
                                ));
                            }
                        };
                    }

                    Some(Status {
                        file: _,
                        zoom: None,
                        pointer,
                        selection,
                        selection_node,
                    }) => {
                        let (w, h) = window.canvas().size();
                        if let Some(point) = threed::get_unprojected_coords(
                            Point2::new(x as f32, y as f32),
                            Vector2::new(w as f32, h as f32),
                            &window,
                        ) {
                            // cursor = point;
                            pointer.set_local_translation(Translation3::from(Vector3::new(
                                point.x, point.y, 0.0,
                            )));
                            // event.inhibited = true;
                            if window
                                .canvas()
                                .get_mouse_button(kiss3d::event::MouseButton::Button1)
                                == Action::Press
                                && modifiers.is_empty()
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
                        };
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
        let mut window = make_window();
        let ids = Ids::new(window.conrod_ui_mut().widget_id_generator());
        window.conrod_ui_mut().theme = theme();
        State {
            window,
            status: None,
            ids,
        }
    }

    fn transition(&mut self, transition: Transition) {
        self.status = handle_transition(
            &mut self.window,
            std::mem::replace(&mut self.status, None),
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
        let assets_dir = {
            match std::env::args().next() {
                None => Path::new("./assets").to_owned(),
                Some(me) => {
                    let me = Path::new(&me).to_owned();
                    match me.parent() {
                        None => Path::new("./assets").to_owned(),
                        Some(parent) => {
                            let assets = parent.join(Path::new("assets"));
                            if assets.exists() {
                                assets
                            } else {
                                Path::new("./assets").to_owned()
                            }
                        }
                    }
                }
            }
        };
        if !assets_dir.exists() {
            panic!("No assets dir found, either at the binary location or the current directory")
        }

        let window_height = self.window.canvas().size().1;
        self.window
            .add_texture(&assets_dir.join(Path::new("background.png")), "background");
        let background = self.window.conrod_texture_id("background").unwrap();
        println!("Height {}", window_height);
        while self.window.render() {
            let transition = {
                let window_height = self.window.canvas().size().1 / 2;
                let mut ui = self.window.conrod_ui_mut().set_widgets();
                self.status
                    .ui(window_height, &mut ui, background, &self.ids)
            };
            if let Some(transition) = transition {
                self.transition(transition);
            }
            let mut manager = self.window.events();
            for mut event in manager.iter() {
                if !event.inhibited {
                    self.handle_event(&mut event)
                }
            }
        }
    }
}

fn someui(file_name: Option<String>, coords: Option<terrain::Coords>, hex: Option<terrain::Hex>) {
    let mut state = State::new();
    if let Some(file_name) = file_name {
        state.transition(Transition::Open(file_name));
    }
    if let Some(coords) = coords {
        state.transition(Transition::Select(coords, 1));
    }
    if let Some(hex) = hex {
        state.transition(Transition::Cut(hex));
    }
    state.run();
}

fn main() {
    use std::env;
    let args: Vec<String> = env::args().collect();
    match args.len() {
        2 => someui(Some(args[1].clone()), None, None),

        6 => someui(
            Some(args[1].clone()),
            Some(terrain::Coords {
                x: args[2].parse().unwrap(),
                y: args[3].parse().unwrap(),
                w: args[4].parse().unwrap(),
                h: args[5].parse().unwrap(),
            }),
            None,
        ),

        9 => someui(
            Some(args[1].clone()),
            Some(terrain::Coords {
                x: args[2].parse().unwrap(),
                y: args[3].parse().unwrap(),
                w: args[4].parse().unwrap(),
                h: args[5].parse().unwrap(),
            }),
            Some(terrain::Hex::new(
                args[6].parse().unwrap(),
                args[7].parse().unwrap(),
                args[8].parse().unwrap(),
            )),
        ),

        7 if args[1].as_str() == "export" => {
            let file_name = args[2].clone();
            let hex = terrain::Hex::new(
                args[3].parse().unwrap(),
                args[4].parse().unwrap(),
                args[5].parse().unwrap(),
            );
            let out_name = args[6].clone();
            let dataset = Dataset::open(Path::new(file_name.as_str())).unwrap();
            let file = profile!(
                "Load file",
                terrain::File::from_dataset(&dataset, file_name)
            );
            let hex = profile!("Make hex", file.to_hex_stl(&hex, 1));
            match hex {
                None => println!("Failed to get stl"),
                Some(stl) => {
                    let mut outfile = std::fs::File::create(out_name).unwrap();
                    profile!("Writing file", stl::write_stl(&mut outfile, &stl).unwrap());
                }
            }
        }

        _ => someui(None, None, None),
    };
    // let (file_name, preselect) =
}
