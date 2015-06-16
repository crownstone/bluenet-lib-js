/// <reference path="ble-ext.ts"/>

declare var module;

//var exports = module.exports = {};
//Object.defineProperty(exports, "BleBase", BleBase);
//Object.defineProperty(exports, "BleState", BleState);
//Object.defineProperty(exports, "BleFilter",BleFilter);
//Object.defineProperty(exports, "BleDevice", BleDevice);
//Object.defineProperty(exports, "BleExt", BleExt);
//Object.defineProperty(exports, "BleUtils", BleUtils);

// Proper export
var bluenet = {};
bluenet.Base = BleBase;
bluenet.State = BleState;
bluenet.Device = BleDevice;
bluenet.Extended = BleExt;
bluenet.Utils = BleUtils;
bluenet.Filter = BleFilter;
module.exports = bluenet;

// Dirty hack to avoid class functions not being able to find other classes
if (window) {
	console.log("export to window");
	window.BleBase = BleBase;
	window.BleState = BleState;
	window.BleDevice = BleDevice;
	window.BleExt = BleExt;
	window.BleUtils = BleUtils;
	window.BleFilter = BleFilter;
}