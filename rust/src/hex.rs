/*

iteration will happen based on cx and cy I think

The hex class will be an iterator, that will produce the "boxes" that things go in?
I think

the indices ...

so, for a 2x2 base. half_height = 1

...

[  ] [  ]
[  ] [  ]

does this mean "4 center-points"? I think it has to.
Which means it's basically...

Ok, so there's not really a "center point" we can point to, right?

So how do we anchor this?

I mean, I guess I could limit things to "only hexagons with odd heights", which I think is actually what I want.
Where "odd height" odd number of rows of *points*, even number of rows of *rects*.

Yeah, let's stick with that.

So we can have a center point, and a half-height. Only the half-height will be (point-rows - 1) / 2.

Annd I've already been doing this in the other algorithm, but sloppily.

*/

use kiss3d::resource::{IndexNum, Mesh};
use na::{Point2, Point3, UnitQuaternion, Vector2, Vector3};

struct Border {
    dx: f32,
    dy: Option<f32>,
    base: usize,
}

pub trait CoordIdx {
    fn coord(&self, x: isize, y: isize) -> IndexNum;
}

// TODO I could do this *much* more efficiently, by calculating the
// length of each line & the offset, because the indices are quite regular.
// ... but this works for now.
pub struct Coords {
    map: std::collections::HashMap<(isize, isize), IndexNum>,
    idx: IndexNum,
}

impl Coords {
    fn new() -> Self {
        Coords {
            map: std::collections::HashMap::new(),
            idx: 0,
        }
    }

    fn add(&mut self, x: isize, y: isize) {
        self.map.insert((x, y), self.idx);
        self.idx += 1;
    }

    fn get(&self, x: isize, y: isize) -> IndexNum {
        *self
            .map
            .get(&(x, y))
            .expect(format!("Coordinate missing! {},{}", x, y).as_str())
    }
}

impl CoordIdx for Coords {
    fn coord(&self, x: isize, y: isize) -> IndexNum {
        self.get(x, y)
    }
}

pub mod inner {
    use super::*;

    fn lerp(start: f32, finish: f32, amount: f32) -> f32 {
        (finish - start) * amount + start
    }
    fn border_for_point_line(half_height: usize, y: usize) -> Border {
        let r3: f32 = -(3.0_f32).sqrt();
        let b = (half_height * 2) as f32;
        let x = (y as f32 - b) / r3;

        let yi = r3 * x.ceil() + b;
        let dy = y as f32 - yi;

        Border {
            dx: x - x.floor(),
            base: x.floor() as usize,
            dy: if y != 0 && dy < 1.0 { Some(dy) } else { None },
        }
    }

    // line is 0-indexed, where 0 is "the line right above or below the middle"
    fn boxes_for_face_line(half_height: usize, y: usize) -> usize {
        let r3: f32 = -(3.0_f32).sqrt();
        let b = (half_height * 2) as f32;
        let x = (y as f32 - b) / r3;

        x.ceil() as usize
    }

    pub fn faces(
        half_height: usize,
        point_at: &Fn(isize, isize) -> IndexNum,
    ) -> (Vec<Point3<IndexNum>>, Vec<Point2<IndexNum>>) {
        // println!("Faces for {}", half_height);
        let hh = half_height as isize;
        let mut faces = vec![];
        let mut edges = vec![];
        let mut last_base = 0;
        for y0 in -hh..hh {
            let boxes = boxes_for_face_line(
                half_height,
                if y0 >= 0 {
                    y0 as usize
                } else {
                    (-y0 - 1) as usize
                },
            ) as isize;
            // println!("Boxes at y0 {}: {}", y0, boxes);

            // left & right caps
            edges.push(Point2::new(
                point_at(boxes, y0 + 1),
                point_at(boxes, y0),
            ));
            edges.push(Point2::new(
                point_at(-boxes, y0),
                 point_at(-boxes, y0 + 1),
                ));

            if last_base < boxes {
                // filling in the top
                for x0 in last_base..boxes {
                    // println!("Top {}", x0);
                    // left side
                    edges.push(Point2::new(point_at(x0, y0), point_at(x0 + 1, y0)));
                    // right side
                    edges.push(
                        Point2::new(
                        point_at(-x0 - 1, y0),
                            point_at(-x0, y0),
                        ));
                }
            } else if last_base > boxes {
                // filling in the bottom
                for x0 in boxes..last_base {
                    // println!("Bottom {} - from {} to {}", x0, boxes, last_base);
                    // left side
                    edges.push(Point2::new(point_at(x0, y0), point_at(x0 + 1, y0)));
                    // right side
                    edges.push(Point2::new(
                        point_at(-x0 - 1, y0),
                        point_at(-x0, y0),
                        ));
                }
            }
            last_base = boxes;

            for x0 in -boxes..boxes {
                faces.push(Point3::new(
                    point_at(x0, y0),
                    point_at(x0 + 1, y0),
                    point_at(x0 + 1, y0 + 1),
                ));
                faces.push(Point3::new(
                    point_at(x0, y0),
                    point_at(x0 + 1, y0 + 1),
                    point_at(x0, y0 + 1),
                ));
            }
        }

        // println!("Last base for {}: {}", half_height, last_base);
        // last at the bottom
        for x0 in 0..last_base {
            // left side
            edges.push(Point2::new(
                point_at(x0, hh),
                point_at(x0 + 1, hh)
                ));
            // right side
            edges.push(Point2::new(
                point_at(-x0 - 1, hh),
                point_at(-x0, hh),
                ));
        }

        (faces, edges)
    }

    pub fn points(
        half_height: usize,
        z_at: &Fn(isize, isize) -> f32,
    ) -> (Vec<Point3<f32>>, Coords) {
        let mut points = vec![];
        let mut coords = Coords::new();

        let hh = half_height as isize;
        for y in -hh..=hh {
            let border = border_for_point_line(half_height, y.abs() as usize);

            let direction = if y > 0 { 1.0 } else { -1.0 };
            let di = if y > 0 { 1_isize } else { -1_isize };

            let hw = border.base as isize;

            let z_prev = z_at(-hw - 1, y);

            if let Some(dy) = border.dy {
                let z_down = z_at(-hw - 1, y + di);
                let zy = lerp(z_prev, z_down, dy);
                points.push(Point3::new(-hw as f32 - 1.0, y as f32 - dy * direction, zy));
                coords.add(-hw - 2, y);
            }

            let z_now = z_at(-hw, y);
            let zx = lerp(z_now, z_prev, border.dx);
            points.push(Point3::new(-hw as f32 - border.dx, y as f32, zx));
            coords.add(-hw - 1, y);

            for x in -hw..=hw {
                let z = z_at(x, y);
                points.push(Point3::new(x as f32, y as f32, z));
                coords.add(x, y);
            }

            let z_next = z_at(hw + 1, y);
            let z_now = z_at(hw, y);
            let zx = lerp(z_now, z_next, border.dx);
            points.push(Point3::new(hw as f32 + border.dx, y as f32, zx));
            coords.add(hw + 1, y);

            if let Some(dy) = border.dy {
                let z_down = z_at(hw + 1, y + di);
                let zy = lerp(z_next, z_down, dy);
                points.push(Point3::new(hw as f32 + 1.0, y as f32 - dy * direction, zy));
                coords.add(hw + 2, y);
            }
        }

        (points, coords)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn boxes_for_line() {
            assert_eq!(boxes_for_face_line(2, 0), 3);
            assert_eq!(boxes_for_face_line(2, 1), 2);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close_enough(p1: &Point3<f32>, p2: &Point3<f32>) -> bool {
        (p1.x - p2.x).abs() <= 1.0 && (p1.y - p2.y).abs() <= 1.0
    }

    fn to_svg(points: &Vec<Point3<f32>>, faces: &Vec<Point3<IndexNum>>) -> String {
        let mut text = vec![
            r#"<svg width="190" height="160" xmlns="http://www.w3.org/2000/svg">"#.to_string(),
        ];

        for p in faces {
            let p1 = points[p.x as usize];
            let p2 = points[p.y as usize];
            let p3 = points[p.z as usize];
            text.push(
                format!(
                    r#"
                    <path d="M{} {} L {} {} L {} {} Z" stroke="black" fill="transparent" stroke-width="0.1" />
                    "#,
                    p1.x * 10.0, p1.y * 10.0,
                    p2.x * 10.0, p2.y * 10.0,
                    p3.x * 10.0, p3.y * 10.0
                )
            );
        }

        text.push("</svg>".to_string());
        text.join("\n")
    }

    fn fixture(
        cx: usize,
        cy: usize,
        size: usize,
    ) -> (
        Vec<Point3<f32>>,
        Vec<Point3<IndexNum>>,
        Vec<Point2<IndexNum>>,
    ) {
        let get_z = |x: isize, y: isize| (y as f32 / 100.0 + x as f32);

        let (points, coords) = inner::points(size, &get_z);
        let (faces, edges) = inner::faces(size, &|x: isize, y: isize| coords.coord(x, y));

        (points, faces, edges)
    }

    #[test]
    fn full_run() {
        let (points, faces, edges) = fixture(2, 1, 1);

        assert_eq!(faces.len(), 16);
        assert_eq!(points.len(), 15);
        assert_eq!(edges.len(), 12);

        // Uncomment to do a visual assessment

        // for p in &points {
        //     println!("assert_eq!(points[i], Point3::new({}, {}, {}))", p.x, p.y, p.z);
        // }

        for p in &faces {
            let p1 = points[p.x as usize];
            let p2 = points[p.y as usize];
            let p3 = points[p.z as usize];
            assert!(close_enough(&p1, &p2), "Close {:?} {:?}", p1, p2);
            assert!(close_enough(&p1, &p3), "Close {:?} {:?}", p1, p3);
            assert!(close_enough(&p3, &p2), "Close {:?} {:?}", p3, p2);
        }

        // std::fs::write(std::path::Path::new("hex.svg"), to_svg(&points, &faces).as_str()).unwrap();

        let (_points, _faces, edges) = fixture(8, 2, 2);
        assert_eq!(edges.len(), 20);
        // std::fs::write(std::path::Path::new("2hex.svg"), to_svg(&points, &faces).as_str()).unwrap();

        let (points, faces, _) = fixture(30, 10, 10);

        for p in &faces {
            let p1 = points[p.x as usize];
            let p2 = points[p.y as usize];
            let p3 = points[p.z as usize];
            assert!(close_enough(&p1, &p2), "Close {:?} {:?}", p1, p2);
            assert!(close_enough(&p1, &p3), "Close {:?} {:?}", p1, p3);
            assert!(close_enough(&p3, &p2), "Close {:?} {:?}", p3, p2);
        }

        // std::fs::write(std::path::Path::new("10hex.svg"), to_svg(&points, &faces).as_str()).unwrap();
    }
}
