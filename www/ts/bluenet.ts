/// <reference path="ble-ext.ts"/>

declare var module;

//var exports = module.exports = {};
//Object.defineProperty(exports, "BleBase", BleBase);
//Object.defineProperty(exports, "BleState", BleState);
//Object.defineProperty(exports, "BleFilter",BleFilter);
//Object.defineProperty(exports, "BleDevice", BleDevice);
//Object.defineProperty(exports, "BleExt", BleExt);
//Object.defineProperty(exports, "BleUtils", BleUtils);

var bluenet = {};

bluenet.BleBase = BleBase;
bluenet.BleState = BleState;
bluenet.BleDevice = BleDevice;
bluenet.BleExt = BleExt;
bluenet.BleUtils = BleUtils;
bluenet.BleFilter = BleFilter;

if (window) {
	console.log("export to window");
	window.BleBase = BleBase;
	window.BleState = BleState;
	window.BleDevice = BleDevice;
	window.BleExt = BleExt;
	window.BleUtils = BleUtils;
	window.BleFilter = BleFilter;
}

module.exports = bluenet;