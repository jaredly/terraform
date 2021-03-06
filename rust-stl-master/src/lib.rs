extern crate byteorder;

use std::io::{Result, Write, ErrorKind, Error};
use byteorder::{ReadBytesExt, LittleEndian, WriteBytesExt};

pub struct Triangle {
    pub normal: [f32; 3],
    pub v1: [f32; 3],
    pub v2: [f32; 3],
    pub v3: [f32; 3],
    pub attr_byte_count: u16,
}

fn point_eq(lhs: [f32; 3], rhs: [f32; 3]) -> bool {
    lhs[0] == rhs[0] && lhs[1] == rhs[1] && lhs[2] == rhs[2]
}

impl PartialEq for Triangle {
    fn eq(&self, rhs: &Triangle) -> bool {
        point_eq(self.normal, rhs.normal) && point_eq(self.v1, rhs.v1) &&
        point_eq(self.v2, rhs.v2) && point_eq(self.v3, rhs.v3) &&
        self.attr_byte_count == rhs.attr_byte_count
    }
}

impl Eq for Triangle {}

pub struct BinaryStlHeader {
    pub header: [u8; 80],
    pub num_triangles: u32,
}

pub struct BinaryStlFile {
    pub header: BinaryStlHeader,
    pub triangles: Vec<Triangle>,
}

fn read_point<T: ReadBytesExt>(input: &mut T) -> Result<[f32; 3]> {
    let x1 = try!(input.read_f32::<LittleEndian>());
    let x2 = try!(input.read_f32::<LittleEndian>());
    let x3 = try!(input.read_f32::<LittleEndian>());

    Ok([x1, x2, x3])
}

fn read_triangle<T: ReadBytesExt>(input: &mut T) -> Result<Triangle> {
    let normal = try!(read_point(input));
    let v1 = try!(read_point(input));
    let v2 = try!(read_point(input));
    let v3 = try!(read_point(input));
    let attr_count = try!(input.read_u16::<LittleEndian>());

    Ok(Triangle {
           normal: normal,
           v1: v1,
           v2: v2,
           v3: v3,
           attr_byte_count: attr_count,
       })
}

fn read_header<T: ReadBytesExt>(input: &mut T) -> Result<BinaryStlHeader> {
    let mut header = [0u8; 80];

    match input.read(&mut header) {
        Ok(n) => {
            if n == header.len() {
                ()
            } else {
                return Err(Error::new(ErrorKind::Other, "Couldn't read STL header"));
            }
        }
        Err(e) => return Err(e),
    };

    let num_triangles = try!(input.read_u32::<LittleEndian>());

    Ok(BinaryStlHeader {
           header: header,
           num_triangles: num_triangles,
       })
}

pub fn read_stl<T: ReadBytesExt>(input: &mut T) -> Result<BinaryStlFile> {

    // read the header
    let header = try!(read_header(input));

    let mut triangles = Vec::new();
    for _ in 0..header.num_triangles {
        triangles.push(try!(read_triangle(input)));
    }

    Ok(BinaryStlFile {
           header: header,
           triangles: triangles,
       })
}

#[cfg(target_endian = "little")]
#[inline]
/// On little-endian systems, we can just do a straight memcpy, leading to a ~50% speed increase overall
fn as_u8(array: [f32; 3]) -> [u8; 12] {
    unsafe {
        std::mem::transmute(array)
    }
}

#[cfg(not(target_endian = "little"))]
#[inline]
/// On big-endian systems, we go with this method, which is still quite fast.
fn as_u8(array: [f32; 3]) -> [u8; 12] {
    let mut res = [0; 12];
    for (i, p) in array.iter().enumerate() {
        let offset = i * 4;
        res[offset..offset + 4].copy_from_slice(&p.to_bits().to_le_bytes());
    }
    res
}

pub fn write_stl<T: Write>(out: &mut T, stl: &BinaryStlFile) -> Result<()> {
    assert_eq!(stl.header.num_triangles as usize, stl.triangles.len());

    try!(out.write_all(&stl.header.header));
    try!(out.write_all(&stl.header.num_triangles.to_le_bytes()));

    let tri_bytes = 3 * 4 * 4 + 2;
    let mut buffer = Vec::<u8>::with_capacity(stl.triangles.len() * tri_bytes);

    for t in stl.triangles.iter() {

        buffer.extend_from_slice(&as_u8(t.normal));
        buffer.extend_from_slice(&as_u8(t.v1));
        buffer.extend_from_slice(&as_u8(t.v2));
        buffer.extend_from_slice(&as_u8(t.v3));

        buffer.extend_from_slice(&t.attr_byte_count.to_le_bytes());
    }
    try!(out.write_all(&buffer));

    Ok(())
}

#[cfg(test)]
mod test {
    use super::{BinaryStlFile, BinaryStlHeader, write_stl, read_stl, Triangle};
    use std::io::Cursor;
    #[test]
    fn write_read() {
        // Make sure we can write and read a simple file.
        let file = BinaryStlFile {
            header: BinaryStlHeader {
                header: [0u8; 80],
                num_triangles: 1,
            },
            triangles: vec![Triangle {
                                normal: [0f32, 1f32, 0f32],
                                v1: [0f32, 0f32, 0f32],
                                v2: [0f32, 0f32, 1f32],
                                v3: [1f32, 0f32, 1f32],
                                attr_byte_count: 0,
                            }],
        };

        let mut buffer = Vec::new();

        match write_stl(&mut buffer, &file) {
            Ok(_) => (),
            Err(_) => panic!(),
        }

        match read_stl(&mut Cursor::new(buffer)) {
            Ok(stl) => {
                assert!(stl.header.num_triangles == file.header.num_triangles);
                assert!(stl.triangles.len() == 1);
                assert!(stl.triangles[0] == file.triangles[0])
            }
            Err(_) => panic!(),
        }
    }
}
