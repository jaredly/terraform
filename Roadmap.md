

- [ ] ok, so the javascript topo algorithm is all kinds of janky. I'd like to switch to https://www.npmjs.com/package/marchingsquares, although it doesn't look like it does the interpolation that https://jurasic-park.de/marching_squares/ does. Ok so honestly I should probably go with modifying https://github.com/missing-user/marching_squares/blob/master/scripts/script_instanced.js to fit my bill, because I'll need to do extra fancy stuff at the borders, in order to get the behavior I want.



Aaaand then it would be really nice to make the rust stuff into a wasm'd webapp, so that I don't have to rely on it building locally. or something. honestly I might be able to get away with js + webgl or something, now that I know more about it.


- [x] figure out how to paint the trail CSV, so I know where to cut
	- seweeeet
- whyyyyyyy does the volcano not have a top???
- also, my smoothing algorithm is hella janky, I need to A debug it and B make it not terrible.
- profit


- [x] get marching squares lookin lit
- [ ] make it handle hexes thanks
- [ ] figure out how to export svgs that make sense
	- [ ] title
	- [ ] border
	- [ ] allow you to fiddle with the offset to make things just right
	- [ ] fix the bug with ... timp? or somewhere.
	- [ ] allow you to specify the number of sheets you'll use (so that cardboard thickness is a possibility)
