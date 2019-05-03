from glumpy import app

window = app.Window(512,512)

@window.event
def on_draw(dt):
    window.clear()

app.run()