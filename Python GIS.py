#!/usr/bin/env python
# coding: utf-8

# In[103]:


import gdal
import gdalconst
import numpy
from stl import mesh
np = numpy


# In[116]:


def convert_file(fname, outfile, sample=5):
    file = gdal.Open(fname, gdalconst.GA_ReadOnly)
    data = file.ReadAsArray(0, 0, file.RasterXSize, file.RasterYSize)
    scaled = data[::sample, ::sample]
    m = geo_mesh2(scaled, 0, 0, len(scaled) - 1, len(scaled[0]) - 1)
    rescale(m)
    print 'ok'
    mesh.Mesh(m).save(outfile)


# In[114]:


convert_file('./N039W111/N039W111_AVE_DSM.tif', 'n39w111.stl')
convert_file('./N039W112/N039W112_AVE_DSM.tif', 'n39w112.stl')
convert_file('./N040W112/N040W112_AVE_DSM.tif', 'n40w112.stl')


# In[115]:


def rescale(m):
    m['vectors'][:,:,0] /= m['vectors'][:,:,0].max() / 10.0
    m['vectors'][:,:,1] /= m['vectors'][:,:,1].max() / 10.0
    m['vectors'][:,:,2] /= 4000


# In[2]:


file = gdal.Open('./N040W112/N040W112_AVE_DSM.tif', gdalconst.GA_ReadOnly)


# In[5]:


data = file.ReadAsArray(0, 0, file.RasterXSize, file.RasterYSize)


# In[83]:


m_small = geo_mesh2(data, 0, 0, len(data) / 5, len(data[0]) / 5)
print 'ok'
mesh.Mesh(m_small).save('./mountains_small2.stl')


# In[117]:


scaled = data[::5, ::5]


# In[119]:


def chunk(data, x, y, w, h):
    fw = len(data)
    fh = len(data[0])
    x0 = int(fw * (x - w/2))
    x1 = int(fw * (x + w/2))
    y0 = int(fh * (y - h/2))
    y1 = int(fh * (y + h/2))
    return data[x0:x1,y0:y1]
# (-3.7, -6.8), w 2.4 to a side


# In[122]:


scaled = chunk(data, 1-0.37, 1-0.68, 0.26, 0.26)
m = geo_mesh2(scaled, 0, 0, len(scaled) - 1, len(scaled[0]) - 1)
rescale(m)
print 'ok'
mesh.Mesh(m).save('./timp.stl')


# In[89]:


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


# In[82]:


m = geo_mesh2(data, 0, 0, len(data) - 1, len(data[0]) - 1)
print 'ok'
mesh.Mesh(m).save('./mountains.stl')


# In[147]:


def show_numpy(data):
    # Optionally render the rotated cube faces
    from matplotlib import pyplot
    from mpl_toolkits import mplot3d

    # Create a new plot
    figure = pyplot.figure()
    axes = mplot3d.Axes3D(figure)

    # Render the cube faces
    m = mesh.Mesh(data.copy())
    axes.add_collection3d(mplot3d.art3d.Poly3DCollection(m.vectors))

    # Auto scale to the mesh size
    # scale = m.points.flatten()
    # axes.auto_scale_xyz(scale, scale, scale)
    # axes.auto_scale_xyz(m.points[::3].flatten(), m.points[1::3].flatten(), m.points[2::3].flatten())
    axes.auto_scale_xyz(m.vectors[:,:,0].flatten(), m.vectors[:,:,1].flatten(), m.vectors[:,:,2].flatten())

    # Show the plot to the screen
    pyplot.show()


# In[141]:


# Create 3 faces of a cube
mdata = numpy.zeros(6, dtype=mesh.Mesh.dtype)

# Top of the cube
mdata['vectors'][0] = numpy.array([[0, 1, 1],
                                  [1, 0, 1],
                                  [0, 0, 1]])
mdata['vectors'][1] = numpy.array([[1, 0, 1],
                                  [0, 1, 1],
                                  [1, 1, 1]])
# Front face
mdata['vectors'][2] = numpy.array([[1, 0, 0],
                                  [1, 0, 1],
                                  [1, 1, 0]])
mdata['vectors'][3] = numpy.array([[1, 1, 1],
                                  [1, 0, 1],
                                  [1, 1, 0]])
# Left face
mdata['vectors'][4] = numpy.array([[0, 0, 0],
                                  [1, 0, 0],
                                  [1, 0, 1]])
mdata['vectors'][5] = numpy.array([[0, 0, 0],
                                  [0, 0, 1],
                                  [1, 0, 1]])

# Since the cube faces are from 0 to 1 we can move it to the middle by
# substracting .5
mdata['vectors'] -= .5

# Generate 4 different meshes so we can rotate them later
meshes = [mesh.Mesh(mdata.copy()) for _ in range(4)]

# Rotate 90 degrees over the Y axis
meshes[0].rotate([0.0, 0.5, 0.0], math.radians(90))

# Translate 2 points over the X axis
meshes[1].x += 2

# Rotate 90 degrees over the X axis
meshes[2].rotate([0.5, 0.0, 0.0], math.radians(90))
# Translate 2 points over the X and Y points
meshes[2].x += 2
meshes[2].y += 2

# Rotate 90 degrees over the X and Y axis
meshes[3].rotate([0.5, 0.0, 0.0], math.radians(90))
meshes[3].rotate([0.0, 0.5, 0.0], math.radians(90))
# Translate 2 points over the Y axis
meshes[3].y += 2

show_numpy(mdata)

