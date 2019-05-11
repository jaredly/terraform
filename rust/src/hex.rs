

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
}

struct Hex {
  cx: usize,
  cy: usize,
  half_height: usize,
}

impl Hex {
  fn new(cx: usize, cy: usize, half_height: usize) -> Self {
    Hex { cx, cy, half_height }
  }
  // line is 0-indexed, where 0 is "the line right above or below the middle"
  fn boxes_for_line(&self, y: usize) -> usize {
    let R3: f32 = (3.0_f32).sqrt();

    let b = (self.half_height * 2) as f32;
    let y = y as f32;
    let x = (y - b) / R3;

    x.ceil() as usize
  }

  fn faces(&self, offsets: &Vec<usize>) -> Vec<Point3<IndexNum>> {
    vec![]
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn boxes_for_line() {
    let hex = Hex::new(50, 50, 2);
    assert_eq!(hex.boxes_for_line(0), 3);
    assert_eq!(hex.boxes_for_line(1), 2);
  }

}



