// TODO: discover services
// TODO: sort ascending / descending


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

	discoverCharacteristics(successCB, errorCB) {
		this.ble.discoverServices(
			this.targetAddress,
			function(serviceUuid, characteristicUuid) {
				this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
				if (successCB) successCB(serviceUuid, characteristicUuid);
			},
			errorCB);
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

	onCharacteristicDiscover(serviceUuid, characteristicUuid) {
		this.characteristics[characteristicUuid] = true;
	}

	setConnectListener(func) {
		this.onConnectCallback = func;
	}

	setTarget(address) {
		this.targetAddress = address;
	}

	getDeviceList() { return this.devices; }

	getState() { return this.state; }

	connectAndDiscoverAll(address, successCB, errorCB) {
		function connectionSuccess() {
			this.ble.discoverServices(
				address,
				function(serviceUuid, characteristicUuid) {
					this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
					if (successCB) successCB();
				},
				function discoveryFailure(msg) {
					console.log(msg);
					this.disconnect();
					if (errorCB) errorCB(msg);
				}
			);
		}

		if (this.state == BleState.initialized) {
//			var timeout = 10;
			this.connect(
				address,
//				timeout,
				connectionSuccess,
				errorCB
			);
		}
		else if (this.state == BleState.connected && this.targetAddress == address) {
			connectionSuccess();
		}
		else {
			if (errorCB) errorCB("Not in correct state to connect and not connected to " + address);
		}
	}

	connectAndDiscoverChar(address, serviceUuid, characteristicUuid, successCB, errorCB) {
		function connectionSuccess() {
			if (this.characteristics.hasOwnProperty(characteristicUuid)) {
				if (successCB) successCB();
			}
			else {
				this.ble.discoverCharacteristic(
					address,
					serviceUuid,
					characteristicUuid,
					function(serviceUuid, characteristicUuid) {
						this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
						if (successCB) successCB();
					},
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
				errorCB
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
		this.connectAndDiscoverChar(address, serviceUuid, characteristicUuid, discoverSuccess, errorCB);
	}



	///////////////////
	// Power service //
	///////////////////

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

	readCurrentConsumption(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(sampleCurrentUuid) ||
			!this.characteristics.hasOwnProperty(currentConsumptionUuid)) {
			errorCB();
			return;
		}
		this.ble.sampleCurrent(
			this.targetAddress,
			0x01,
			function() {
				this.ble.readCurrentConsumption(this.targetAddress, successCB); //TODO: should have an errorCB
			}); // TODO: should have an errorCB
	}

	readCurrentCurve(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(sampleCurrentUuid) ||
			!this.characteristics.hasOwnProperty(currentCurveUuid)) {
			errorCB();
			return;
		}
		this.ble.sampleCurrent(
			this.targetAddress,
			0x02,
			function() {
				this.ble.getCurrentCurve(this.targetAddress, successCB); //TODO: should have an errorCB
			}); // TODO: should have an errorCB
	}

	writeCurrentLimit(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(currentLimitUuid)) {
			errorCB();
			return;
		}
		console.log("TODO");
		//this.ble.writeCurrentLimit(this.targetAddress, value)
	}

	readCurrentLimit(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(currentLimitUuid)) {
			errorCB();
			return;
		}
		console.log("TODO");
		this.ble.readCurrentLimit(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	/////////////////////
	// General service //
	/////////////////////

	readTemperature(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(temperatureCharacteristicUuid)) {
			errorCB();
			return;
		}
		this.ble.readTemperature(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeMeshMessage(obj, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(meshCharacteristicUuid)) {
			errorCB();
			return;
		}
		console.log("Send mesh message: ", obj);
		this.ble.writeMeshMessage(this.targetAddress, obj, successCB, errorCB)
	}

	writeConfiguration(obj, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
			return;
		}
		console.log("Set config");
		this.ble.writeConfiguration(this.targetAddress, obj, successCB, errorCB);
	}

	connectAndWriteConfiguration(address, config, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.writeConfiguration(config, successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, generalServiceUuid, setConfigurationCharacteristicUuid, func, successCB, errorCB);
	}

	readConfiguration(configurationType, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(selectConfigurationCharacteristicUuid) ||
			!this.characteristics.hasOwnProperty(getConfigurationCharacteristicUuid)) {
			errorCB();
			return;
		}
		this.ble.getConfiguration(this.targetAddress, configurationType, successCB, errorCB);
	}

	// TODO writing/reading configs, should be replaced with a functions to convert value object to a config object and then call writeConfiguration

	readDeviceName(successCB, errorCB) {
		console.log("TODO");
		//this.readConfiguration(configNameUuid, successCB, errorCB);
	}

	writeDeviceName(value, successCB, errorCB) {
		console.log("TODO");
	}

	readDeviceType(successCB, errorCB) {
		console.log("TODO");
		//this.readConfiguration(configNameUuid, successCB, errorCB);
	}

	writeDeviceType(value, successCB, errorCB) {
		console.log("TODO");
	}

	readFloor(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(selectConfigurationCharacteristicUuid) ||
			!this.characteristics.hasOwnProperty(getConfigurationCharacteristicUuid)) {
			errorCB();
			return;
		}
		this.ble.getFloor(this.targetAddress, successCB, errorCB);
	}

	writeFloor(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
			errorCB();
			return;
		}
		this.ble.setFloor(this.targetAddress, value, successCB, errorCB);
	}

	readRoom(successCB, errorCB) {
		console.log("TODO");
		//this.readConfiguration(configNameUuid, successCB, errorCB);
	}

	writeRoom(value, successCB, errorCB) {
		console.log("TODO");
	}

	// TODO: value should be an object with ssid and pw
	writeWifi(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
			errorCB();
			return;
		}
		console.log("Set wifi to " + value);
		this.ble.setWifi(this.targetAddress, value, successCB, errorCB);
	}

	// TODO: value should be an object with ssid and pw
	connectAndWriteWifi(address, value, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.writeWifi(value, successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, generalServiceUuid, setConfigurationCharacteristicUuid, func, successCB, errorCB);
	}

	readIp(successCB, errorCB) {
		this.readConfiguration(configWifiUuid, successCB, errorCB);
	}

	// TODO: should we also discover selectConfigurationCharacteristicUuid ? Seems like we're just lucky now.
	connectAndReadIp(address, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.readIp(successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, generalServiceUuid, getConfigurationCharacteristicUuid, func, successCB, errorCB);
	}

	//////////////////////////
	// Localization service //
	//////////////////////////

	readTrackedDevices(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(deviceListUuid)) {
			errorCB();
			return;
		}
		this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeTrackedDevice(deviceAddress, rssiThreshold, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(addTrackedDeviceUuid)) {
			errorCB();
			return;
		}
		console.log("TODO");
	}

	readScannedDevices(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(deviceListUuid)) {
			errorCB();
			return;
		}
		this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeScanDevices(scan : boolean, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(deviceScanUuid)) {
			errorCB();
			return;
		}
		this.ble.scanDevices(this.targetAddress, scan); //TODO: needs callbacks
		if (successCB) setTimeout(successCB(), 1000);
	}

	/* Makes the crownstone scan for other devices and report the result
	 */
	scanForDevices(successCB, errorCB) {
		// Enable scanning
		this.writeScanDevices(
			true,
			function() {
				setTimeout(stopScanAndReadResult, 10000);
			},
			errorCB);

		// Stop scanning and read result
		function stopScanAndReadResult() {
			this.writeScanDevices(
				false,
				this.readScannedDevices(successCB, errorCB),
				errorCB
			);
		}
	}

}
