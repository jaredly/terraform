

- [ ] ok, so the javascript topo algorithm is all kinds of janky. I'd like to switch to https://www.npmjs.com/package/marchingsquares, although it doesn't look like it does the interpolation that https://jurasic-park.de/marching_squares/ does. Ok so honestly I should probably go with modifying https://github.com/missing-user/marching_squares/blob/master/scripts/script_instanced.js to fit my bill, because I'll need to do extra fancy stuff at the borders, in order to get the behavior I want.



Aaaand then it would be really nice to make the rust stuff into a wasm'd webapp, so that I don't have to rely on it building locally. or something. honestly I might be able to get away with js + webgl or something, now that I know more about it.


- [x] figure out how to paint the trail CSV, so I know where to cut
	- seweeeet
- whyyyyyyy does the volcano not have a top???
- also, my smoothing algorithm is hella janky, I need to A debug it and B make it not terrible.
- profit


- [x] get marching squares lookin lit
- [x] make it handle hexes thanks
- [x] and borders!
- [x] determine whether the margin was calculated as being in addition to the other bit
	- oooh ok margin is "hmargin", /not/ vmargin, so I'll need to mess with things a little.
	- switch them.
- [x] render a title


BUGGGG the hex export is weeeeeirdly offset
- rect export looks fine
- but hex export, if I do it small, is very much off of where I wanted it. not sure what's happening.
	looks like the dimensions are on target
	but the coord is like shifted up 15 pixels
- ooooh here's a clue. If the hex is well-centered in the cut rect, then it's correctly set up.
- yeah that's the trick to circumvent the bug.
	now to actually fix it...



- [ ] remove little bits that won't be helpful? I mean sure, it's fine I guess.
- [ ] figure out how to export svgs that make sense
	- [ ] title
	- [ ] border
	- [ ] allow you to fiddle with the offset to make things just right
	- [ ] fix the bug with ... timp? or somewhere.
	- [ ] allow you to specify the number of sheets you'll use (so that cardboard thickness is a possibility)
