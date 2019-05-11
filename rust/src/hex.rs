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

trait CoordIdx {
    fn coord(&self, x: isize, y: isize) -> IndexNum;
}

struct Coords {
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
        *self.map.get(&(x, y)).expect("Coordinate missing!")
    }
}

impl CoordIdx for Coords {
    fn coord(&self, x: isize, y: isize) -> IndexNum {
        self.get(x, y)
    }
}

struct Hex {
    cx: usize,
    cy: usize,
    half_height: usize,
}

fn lerp(start: f32, finish: f32, amount: f32) -> f32 {
    (finish - start) * amount + start
}

impl Hex {
    fn new(cx: usize, cy: usize, half_height: usize) -> Self {
        Hex {
            cx,
            cy,
            half_height,
        }
    }

    fn border_for_point_line(&self, y: usize) -> Border {
        let r3: f32 = -(3.0_f32).sqrt();
        let b = (self.half_height * 2) as f32;
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
    fn boxes_for_face_line(&self, y: usize) -> usize {
        let r3: f32 = -(3.0_f32).sqrt();
        let b = (self.half_height * 2) as f32;
        let x = (y as f32 - b) / r3;

        x.ceil() as usize
    }

    fn faces(&self, point_at: &Fn(isize, isize) -> IndexNum) -> Vec<Point3<IndexNum>> {
        let hh = self.half_height as isize;
        let mut faces = vec![];
        for y0 in -hh..hh {
            let boxes = self.boxes_for_face_line(if y0 >= 0 { y0 as usize } else { (y0 + 1) as usize })
                as isize;
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
        faces
    }

    fn points(&self, z_at: &Fn(isize, isize) -> f32) -> Vec<Point3<f32>> {
        let mut points = vec![];
        let mut coords = Coords::new();

        let hh = self.half_height as isize;
        for y in -hh..=hh {
            let border = self.border_for_point_line(y.abs() as usize);
            let hw = border.base as isize;

            let z_prev = z_at(-hw - 1, y);

            if let Some(dy) = border.dy {
                let z_down = z_at(-hw - 1, y + 1);
                let zy = lerp(z_prev, z_down, dy);
                points.push(Point3::new(-hw as f32 - 1.0, y as f32 + dy, zy));
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
                let z_down = z_at(hw + 1, y + 1);
                let zy = lerp(z_next, z_down, dy);
                points.push(Point3::new(hw as f32 + 1.0, y as f32 + dy, zy));
                coords.add(hw + 2, y);
            }
        }

        points
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn boxes_for_line() {
        let hex = Hex::new(50, 50, 2);
        assert_eq!(hex.boxes_for_face_line(0), 3);
        assert_eq!(hex.boxes_for_face_line(1), 2);
    }

}
