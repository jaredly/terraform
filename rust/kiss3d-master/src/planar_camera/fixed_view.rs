use event::WindowEvent;
use na::{self, Matrix3, Point2, Vector2, Vector3};
use planar_camera::PlanarCamera;
use resource::ShaderUniform;
use std::f32;
use window::Canvas;

/// A camera that cannot move.
#[derive(Clone, Debug)]
pub struct FixedView {
    proj: Matrix3<f32>,
    inv_proj: Matrix3<f32>,
}

impl FixedView {
    /// Create a new static camera.
    pub fn new() -> FixedView {
        FixedView {
            proj: na::one(),
            inv_proj: na::one(),
        }
    }
}

impl PlanarCamera for FixedView {
    fn handle_event(&mut self, canvas: &Canvas, event: &WindowEvent) {
        let hidpi = canvas.hidpi_factor();

        match *event {
            WindowEvent::FramebufferSize(w, h) => {
                let diag = Vector3::new(
                    2.0 * (hidpi as f32) / (w as f32),
                    2.0 * (hidpi as f32) / (h as f32),
                    1.0,
                );
                let inv_diag = Vector3::new(1.0 / diag.x, 1.0 / diag.y, 1.0);

                self.proj = Matrix3::from_diagonal(&diag);
                self.inv_proj = Matrix3::from_diagonal(&inv_diag);
            }
            _ => {}
        }
    }

    #[inline]
    fn upload(
        &self,
        proj: &mut ShaderUniform<Matrix3<f32>>,
        view: &mut ShaderUniform<Matrix3<f32>>,
    ) {
        let view_mat = Matrix3::identity();
        proj.upload(&self.proj);
        view.upload(&view_mat);
    }

    fn update(&mut self, _: &Canvas) {}

    fn unproject(&self, window_coord: &Point2<f32>, size: &Vector2<f32>) -> Point2<f32> {
        let normalized_coords = Point2::new(
            2.0 * window_coord.x / size.x - 1.0,
            2.0 * -window_coord.y / size.y + 1.0,
        );

        let unprojected_hom = self.inv_proj * normalized_coords.to_homogeneous();
        Point2::from_homogeneous(unprojected_hom).unwrap()
    }
}
