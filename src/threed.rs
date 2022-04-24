extern crate nalgebra as na;

use kiss3d::event::{Action, Key, Modifiers, MouseButton, WindowEvent};
use kiss3d::light::Light;
use kiss3d::resource::{IndexNum, Mesh};
use kiss3d::window::Window;
use na::{Point2, Point3, Rotation3, Translation3, UnitQuaternion, Vector2, Vector3};
use ncollide3d::procedural::{IndexBuffer, TriMesh};
use std::time::SystemTime;

pub fn get_unprojected_coords(
    point: Point2<f32>,
    size: Vector2<f32>,
    window: &Window,
) -> Option<Point2<f32>> {
    use ncollide3d::query::ray_internal::ray::RayCast;
    let (point, dir) = window.unproject(&point, &size);
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

pub fn make_prism(positions: &[(f32, f32)], closed: bool) -> TriMesh<f32> {
    let mut points = vec![];
    let mut faces = vec![];

    for (i, (x, y)) in positions.iter().enumerate() {
        // if !closed && i == positions.len() - 1 {
        //     continue;
        // }
        let x = *x;
        let y = *y;
        let i2 = if i == positions.len() - 1 {
            0
        } else {
            i as u32 + 1
        };
        let i = i as u32;
        points.push(Point3::new(x, y, -1.0));
        points.push(Point3::new(x, y, 1.0));
        faces.push(Point3::new(i * 2, i * 2 + 1, i2 * 2));
        faces.push(Point3::new(i * 2 + 1, i2 * 2, i2 * 2 + 1));
    }

    TriMesh::new(points, None, None, Some(IndexBuffer::Unified(faces)))
}

pub fn make_hex() -> TriMesh<f32> {
    //    a   b
    // f         c
    //    e   d

    let rt3 = (3.0_f32).sqrt();
    let positions: [(f32, f32); 6] = [
        (-0.5, -rt3 / 2.0),
        (0.5, -rt3 / 2.0),
        (1.0, 0.0),
        (0.5, rt3 / 2.0),
        (-0.5, rt3 / 2.0),
        (-1.0, 0.0),
    ];

    make_prism(&positions, true)
}

pub fn make_selection() -> TriMesh<f32> {
    let positions = [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)];

    make_prism(&positions, true)
}
