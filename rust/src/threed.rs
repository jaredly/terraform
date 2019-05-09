extern crate nalgebra as na;

use kiss3d::event::{Action, Key, Modifiers, MouseButton, WindowEvent};
use kiss3d::light::Light;
use kiss3d::resource::{IndexNum, Mesh};
use kiss3d::window::Window;
use na::{Point2, Point3, Rotation3, Translation3, UnitQuaternion, Vector2, Vector3};
use ncollide3d::procedural::{IndexBuffer, TriMesh};
use std::time::SystemTime;

pub fn get_unprojected_coords(
    point: &Point2<f32>,
    size: &Vector2<f32>,
    window: &Window,
) -> Option<Point2<f32>> {
    use ncollide3d::query::ray_internal::ray::RayCast;
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

pub fn make_selection() -> TriMesh<f32> {
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
