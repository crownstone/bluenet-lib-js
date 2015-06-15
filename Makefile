
all: js

js:
	tsc --out www/bluenet.js www/ts/bluenet.ts

clean:
	rm bluenet.js
