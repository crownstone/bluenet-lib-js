/// <reference path="ble-ext.ts"/>

declare var module;

//var exports = module.exports = {};
//Object.defineProperty(exports, "BleBase", BleBase);
//Object.defineProperty(exports, "BleState", BleState);
//Object.defineProperty(exports, "BleFilter",BleFilter);
//Object.defineProperty(exports, "BleDevice", BleDevice);
//Object.defineProperty(exports, "BleExt", BleExt);
//Object.defineProperty(exports, "BleUtils", BleUtils);

interface Bluenet {
	BleBase: any;
	BleState: any;
	BleDevice: any;
	BleExt: any;
	BleUtils: any;
	BleFilter: any;
	BleTypes: any;
}

interface Window extends Bluenet {}

// Proper export
// var bluenet = new Bluenet();
var bluenet : Bluenet = <Bluenet>{};
bluenet.BleBase = BleBase;
bluenet.BleState = BleState;
bluenet.BleDevice = BleDevice;
bluenet.BleExt = BleExt;
bluenet.BleUtils = BleUtils;
bluenet.BleFilter = BleFilter;
bluenet.BleTypes = BleTypes;
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
	window.BleTypes = BleTypes;
}
