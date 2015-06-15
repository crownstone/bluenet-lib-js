
all: js

js:
	tsc --out ble.js www/ts/ble-ext.ts

clean:
	rm ble.js
