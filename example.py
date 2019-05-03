
def load(fname):
    file = gdal.Open(fname, gdalconst.GA_ReadOnly)
    return file.ReadAsArray(0, 0, file.RasterXSize, file.RasterYSize)

def get_file(fname, outfile, sample=5, chunk_config=None):
    data = load(fname)
    if chunk:
        data = chunk(data, *chunk_config)
    scaled = data[::sample, ::sample]
    m = geo_mesh2(scaled, 0, 0, len(scaled) - 1, len(scaled[0]) - 1)
    rescale(m)
    return m

def geo_mesh2(geo, x, y, w, h):
    data = numpy.zeros(w * h * 3).reshape((w, h, 3))
    print len(data)
    i0 = numpy.indices((w, h))
    print len(data)
    indices = i0.swapaxes(0,2).swapaxes(0,1)
    data[:,:,:2] = indices
    min = geo.min()
    data[:, :, 2] = (geo[x:x+w,y:y+h] - min)
    # now we have x, y, z just fine
    # return data
    p0 = numpy.array([
        data[:-1,:-1].reshape((-1, 3)),
        data[1:, :-1].reshape((-1, 3)),
        data[1:, 1:].reshape((-1, 3))
    ]).swapaxes(0, 1)
    p1 = numpy.array([
        data[:-1, :-1].reshape((-1, 3)),
        data[1:, 1:].reshape((-1, 3)),
        data[:-1, 1:].reshape((-1, 3))
    ]).swapaxes(0, 1)
    total = numpy.concatenate([p0, p1])
    m = numpy.zeros((w - 1) * (h - 1) * 2, dtype=mesh.Mesh.dtype)
    m['vectors'] = total
    return m

def chunk(data, x, y, w, h):
    fw = len(data)
    fh = len(data[0])
    x0 = int(fw * (x - w/2))
    x1 = int(fw * (x + w/2))
    y0 = int(fh * (y - h/2))
    y1 = int(fh * (y + h/2))
    return data[x0:x1,y0:y1]

def rescale(m):
    m['vectors'][:,:,0] /= m['vectors'][:,:,0].max() / 10.0
    m['vectors'][:,:,1] /= m['vectors'][:,:,1].max() / 10.0
    m['vectors'][:,:,2] /= 4000


from glumpy import app, gloo, gl

window = app.Window()

vertex = """
         vec2 attribute position;
         void main()
         {
             gl_Position = vec4(position, 0.0, 1.0);
         } """

fragment = """
           uniform vec4 color;
           void main() {
               gl_FragColor = color;
           } """

quad = gloo.Program(vertex, fragment, count=4)

quad['position'] = [(-0.5, -0.5),
                    (-0.5, +0.5),
                    (+0.5, -0.5),
                    (+0.5, +0.5)]
quad['color'] = 0,0,0,1

@window.event
def on_draw(dt):
    window.clear()
    quad.draw(gl.GL_TRIANGLE_STRIP)

app.run()