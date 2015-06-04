declare var BleBase;

enum BleState {
	uninitialized,
	initialized,
	scanning,
	connecting,
	connected
}

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
	targetAddress : string;
//	closestRssi = -128;
//	closestAddress = "";
	characteristics = {};
	onConnectCallback;
	state = BleState.uninitialized;
	disconnectTimeout;
	
	// TODO: just inherit from base class
	init(successCB, errorCB) {
		this.ble.init(function(enabled) {
			if (enabled) {
				this.state = BleState.initialized;
				if (successCB) successCB();
			}
			else {
				if (errorCB) errorCB();
			}
		});
	}
	
	startScan(scanCB) {
		this.state = BleState.scanning;
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
			
			if (scanCB) scanCB(obj);
		});
//		}.bind(this));
	}
	
	// TODO: just inherit from base class
	stopScan(successCB, errorCB) {
		this.state = BleState.initialized;
		this.ble.stopEndlessScan();
		if (successCB) successCB();
	}

	connect(address, successCB, errorCB) {
		if (address) {
			this.setTarget(address);
		}
		this.state = BleState.connecting;
		this.ble.connectDevice(this.targetAddress, 5, function(success) {
			if (success) {
				this.onConnect();
				if (successCB) successCB();
			}
			else {
				if (errorCB) errorCB();
			}
		});
	}

	disconnect(successCB, errorCB) {
		this.ble.disconnectDevice(
			this.targetAddress,
			function() {
				this.onDisconnect();
				successCB();
			},
			function() {
				console.log("Assuming we are disconnected anyway");
				errorCB();
			});
	}

	// Called on successful connect
	onConnect() {
		this.state = BleState.connected;
		if (this.disconnectTimeout != null) {
			clearTimeout(this.disconnectTimeout);
		}
		if (this.onConnectCallback) this.onConnectCallback();
	}

	onDisconnect() {
		this.state = BleState.initialized;
		if (this.disconnectTimeout != null) {
			clearTimeout(this.disconnectTimeout);
		}
		//this.targetAddress = "";
		this.characteristics = {};
	}

	setConnectListener(func) {
		this.onConnectCallback = func;
	}

	setTarget(address) {
		this.targetAddress = address;
	}

	getDeviceList() { return this.devices; }

	getState() { return this.state; }

	powerOn(successCB, errorCB) {
		this.writePWM(255, successCB, errorCB);
	}

	powerOff(successCB, errorCB) {
		this.writePWM(0, successCB, errorCB);
	}

	writePWM(pwm, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(pwmUuid)) {
			errorCB();
			return;
		}
		console.log("Set pwm to " + pwm);
		this.ble.writePWM(this.targetAddress, pwm, successCB, errorCB);
	}

	connectAndWritePWM(address, pwm, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.writePWM(pwm, successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, powerServiceUuid, pwmUuid, func, successCB, errorCB);
	}

	readPWM(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(pwmUuid)) {
			errorCB();
			return;
		}
		console.log("Reading current PWM value");
		this.ble.readPWM(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	connectAndReadPWM(address, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.readPWM(successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, powerServiceUuid, pwmUuid, func, successCB, errorCB);
	}

	writeMeshMessage(obj, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(meshCharacteristicUuid)) {
			errorCB();
			return;
		}
		console.log("Send mesh message: ", obj);
		this.ble.writeMeshMessage(this.targetAddress, obj, successCB, errorCB)
	}

	writeConfiguration(obj, callback) {
		if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
			return;
		}
		console.log("Set config");
		this.ble.writeConfiguration(this.targetAddress, obj, callback);
	}

	connectAndDiscover(address, serviceUuid, characteristicUuid, successCB, errorCB) {
		function connectionSuccess() {
			if (this.characteristics.hasOwnProperty(characteristicUuid)) {
				if (successCB) successCB();
			}
			else {
				this.ble.discoverCharacteristic(
					address,
					serviceUuid,
					characteristicUuid,
					successCB,
					function discoveryFailure(msg) {
						console.log(msg);
						this.disconnect();
						if (errorCB) errorCB(msg);
					}
				);
			}
		}

		if (this.state == BleState.initialized) {
//			var timeout = 10;
			this.connect(
				address,
//				timeout,
				connectionSuccess,
				function connectionFailure(msg) {
					if (errorCB) errorCB(msg);
				}
			);
		}
		else if (this.state == BleState.connected && this.targetAddress == address) {
			connectionSuccess();
		}
		else {
			if (errorCB) errorCB("Not in correct state to connect and not connected to " + address);
		}
	}

	/* Connects, discovers characteristic, executes given function, then disconnects
	 */
	connectExecuteAndDisconnect(address, serviceUuid, characteristicUuid, func, successCB, errorCB) {
		// Function that has to be called when "func" is done.
		function callback() {
			// Delayed disconnect, such that if ConnectExecuteAndDisconnect is called again, we don't have to connect again.
			if (this.disconnectTimeout != null) {
				clearTimeout(this.disconnectTimeout);
			}
			this.disconnectTimeout = setTimeout(this.disconnect(), 1000);
		}

		// Function to be called when connected and characteristic has been discovered.
		function discoverSuccess() {
			func(
				function () {
					callback();
					if (successCB) successCB();
				},
				function() {
					callback();
					if (errorCB) errorCB();
				}
			);
		}

		// And here we go..
		this.connectAndDiscover(address, serviceUuid, characteristicUuid, discoverSuccess, errorCB);
	}

	connectAndTogglePower(address, successCB, errorCB) {
		this.connectAndReadPWM(
			address,
			function(value) {
				if (value > 0) {
					this.connectAndWritePWM(address, 0, successCB, errorCB);
				}
				else {
					this.connectAndWritePWM(address, 255, successCB, errorCB);
				}
			},
			errorCB);
	}





}
