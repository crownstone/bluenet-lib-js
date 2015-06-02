declare var BleBase;

class BleDevice {
	address = "";
	name = "";
	rssi = -128;
	constructor(obj) {
		if (obj.hasOwnProperty("address") && obj.hasOwnProperty("name") && obj.hasOwnProperty("rssi")) {
			this.address = obj.address;
			this.name = obj.name;
			this.rssi = obj.rssi;
		}
	}
}

class BleDeviceList {
	devices = [];
	getDevice(address) {
		var index;
		if (this.devices.some(
				function(el, ind) {
					if (el.address == address) {
						index = ind;
						return true;
					}
				})) {
			return this.devices[index];
		}
		return undefined;
	}

	//addDevice(obj: BleDevice) {
	//	if (!this.getDevice(obj.address)) {
	//		this.devices.push(obj);
	//	}
	//}

	updateDevice(device: BleDevice) {
		var dev = this.getDevice(device.address);
		if (dev) {
			dev = device;
		}
		else {
			//this.addDevice(obj);
			this.devices.push(device);
		}
	}

	// Sort by RSSI, descending.
	sort() {
		this.devices.sort(function(a,b) {
			return b.rssi - a.rssi;
		});
	}
}

class BleExt {
	ble = new BleBase();
	devices = new BleDeviceList();
//	closestRssi = -128;
//	closestAddress = "";
	characteristics = {};
	
	// TODO: just inherit from base class
	init(callback) {
		this.ble.init(function(enabled) {
			if (callback) {
				callback(enabled);
			}
		});
	}
	
	startScan(callback) {
		this.ble.startEndlessScan(function(obj) {
			
			//var index;
			//if (this.devices.some(function(el, ind) { if (el.address == obj.address) { index = ind; return true; } })) {
			//	this.devices[index] =
			//}
			this.devices.updateDevice(new BleDevice(obj));
			this.devices.sort();

			//// Add device to list
			//if (!this.devices.hasOwnProperty(obj.address)) {
			//	this.devices[obj.address] = {'name': obj.name, 'rssi': obj.rssi};
			//} else {
			//	this.devices[obj.address]['rssi'] = obj.rssi;
			//}
			//
			//// Check if this is the closest device
			//if (obj.rssi > this.closestRssi) {
			//	this.closestRssi = obj.rssi;
			//	this.closestAddress = obj.address;
			//}
			
			if (callback) {
				callback();
			}
		});
//		}.bind(this));
	}
	
	// TODO: just inherit from base class
	stopScan(callback) {
		this.ble.stopEndlessScan();
		if (callback) {
			callback(true);
		}
	}
}
