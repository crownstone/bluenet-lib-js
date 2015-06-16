// TODO: discover services
// TODO: sort ascending / descending

/// <reference path="ble-base.ts"/>
/// <reference path="ble-utils.ts"/>

enum BleState {
	uninitialized,
	initialized,
	scanning,
	connecting,
	connected
}

enum BleFilter {
	all,
	crownstone,
	doBeacon,
	iBeacon
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

	clear() {
		this.devices = [];
	}

	// TODO: keep up average rssi
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
	scanFilter = BleFilter.all;

	// TODO: just inherit from base class
	init(successCB, errorCB) {
		// if (this.state == BleState.initialized) {
		// 	if (successCB) successCB();
		// 	return;
		// }

		this.ble.init(
			function(enabled) {
				if (enabled) {
					this.state = BleState.initialized;
					if (successCB) successCB();
				}
				else {
					this.state = BleState.uninitialized;
					if (errorCB) errorCB();
				}
			}.bind(this)
		);
	}

	/*
	 * Filter scanned devices.
	 */
	setScanFilter(filter : BleFilter) {
		//if (!Array.isArray(filter)) {
		//	console.log("Must supply an array!");
		//	return;
		//}
		this.scanFilter = filter;
	}

	startScan(scanCB, errorCB) {
		if (this.state !== BleState.initialized) {
			console.log("State must be \"initialized\"");
			return;
		}
		this.devices.clear();

		this.state = BleState.scanning;
		this.ble.startEndlessScan( //TODO: should have an errorCB
			function(obj) {
				// if (this.scanFilter.length > 0) {
					//var pass = false;
					//for (var i=0; i<this.scanFilter.length; i++) {
					//	if ((this.scanFilter[i] == BleFilter.crownstone && obj.isCrownstone) ||
					//		(this.scanFilter[i] == BleFilter.doBeacon && obj.isIBeacon) ||
					//		(this.scanFilter[i] == BleFilter.iBeacon && obj.isIBeacon)) {
					//		pass = true;
					//		break;
					//	}
					//}
					//if (!pass) {
					//	return;
					//}
				// }
				if ((this.scanFilter != BleFilter.all) &&
					((this.scanFilter == BleFilter.crownstone && !obj.isCrownstone) ||
					(this.scanFilter == BleFilter.doBeacon && !obj.isIBeacon) ||
					(this.scanFilter == BleFilter.iBeacon && !obj.isIBeacon))) {
					return;
				}
				this.devices.updateDevice(new BleDevice(obj));
				this.devices.sort();
				if (scanCB) scanCB(obj);
			}.bind(this)
		);
	}

	// TODO: just inherit from base class
	stopScan(successCB, errorCB) {
		this.state = BleState.initialized;
		this.ble.stopEndlessScan();
		if (successCB) successCB();
	}

	connect(address, successCB, errorCB) {
		console.log("Connect");
		var self = this;
		if (address) {
			this.setTarget(address);
		}
		this.state = BleState.connecting;
		this.ble.connectDevice(
			this.targetAddress,
			5,
			function(success) {
				if (success) {
					self.onConnect();
					if (successCB) successCB();
				}
				else {
					if (errorCB) errorCB();
				}
			}
		);
	}

	disconnect(successCB, errorCB) {
		console.log("Disconnect");
		var self = this;
		this.ble.disconnectDevice(
			this.targetAddress,
			function() {
				self.onDisconnect();
				if (successCB) successCB();
			},
			function() {
				console.log("Assuming we are disconnected anyway");
				if (errorCB) errorCB();
			}
		);
	}

	discoverServices(characteristicCB, successCB, errorCB) {
		this.ble.discoverServices(
			this.targetAddress,
			function(serviceUuid, characteristicUuid) {
				this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
				if (characteristicCB) characteristicCB(serviceUuid, characteristicUuid);
			}.bind(this),
			successCB,
			errorCB
		);
	}

	// Called on successful connect
	onConnect() {
		console.log("onConnect");
		this.state = BleState.connected;
		if (this.disconnectTimeout != null) {
			clearTimeout(this.disconnectTimeout);
		}
		if (this.onConnectCallback) this.onConnectCallback();
	}

	onDisconnect() {
		console.log("onDisconnect");
		this.state = BleState.initialized;
		if (this.disconnectTimeout != null) {
			clearTimeout(this.disconnectTimeout);
		}
		//this.targetAddress = "";
		this.characteristics = {};
	}

	onCharacteristicDiscover(serviceUuid, characteristicUuid) {
		console.log("Discovered characteristic: " + characteristicUuid);
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

	connectAndDiscover(address, characteristicCB, successCB, errorCB) {
		var connectionSuccess = function () {
			this.ble.discoverServices(
				address,
				null,
				function(obj) {
					var services = obj.services;
					for (var i = 0; i < services.length; ++i) {
						var serviceUuid = services[i].serviceUuid;
						var characteristics = services[i].characteristics;
						for (var j = 0; j < characteristics.length; ++j) {
							var characteristicUuid = characteristics[j].characteristicUuid;
							this.onCharacteristicDiscover(serviceUuid, characteristicUuid);

							if (characteristicCB) {
								characteristicCB(serviceUuid, characteristicUuid);
							}
						}
					}
					if (successCB) successCB();
				}.bind(this),
				function (msg) {
					console.log(msg);
					this.disconnect();
					if (errorCB) errorCB(msg);
				}.bind(this)
			);
		};

		if (this.state == BleState.initialized) {
//			var timeout = 10;
			this.connect(
				address,
//				timeout,
				connectionSuccess.bind(this),
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
	connectExecuteAndDisconnect(address, func, successCB, errorCB) {
		var self = this;
		// Function that has to be called when "func" is done.
		var callback = function() {
			// Delayed disconnect, such that if ConnectExecuteAndDisconnect is called again, we don't have to connect again.
			if (self.disconnectTimeout != null) {
				clearTimeout(self.disconnectTimeout);
			}
			self.disconnectTimeout = setTimeout(self.disconnect.bind(self), 1000);
		};

		// Function to be called when connected and characteristic has been discovered.
		var discoverSuccess = function() {
			func(
				// TODO: variable number of orguments: use "arguments.length" and successCB.apply(successCB, args)
				// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
				// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply
				function (arg) {
					callback();
					if (successCB) successCB(arg);
				},
				function(arg) {
					callback();
					if (errorCB) errorCB(arg);
				}
			);
		};

		// And here we go..
		this.connectAndDiscover(address, null, discoverSuccess, errorCB);
	}



	///////////////////
	// Power service //
	///////////////////

	// TODO: keep up PWM value and use it
	togglePower(successCB, errorCB) {
		console.log("Toggle power");
		this.readPWM(
			function(value) {
				if (value > 0) {
					this.writePWM(0, successCB, errorCB);
				}
				else {
					this.writePWM(255, successCB, errorCB);
				}
			}.bind(this),
			errorCB
		);
	}

	powerOn(successCB, errorCB) {
		this.writePWM(255, successCB, errorCB);
	}

	powerOff(successCB, errorCB) {
		this.writePWM(0, successCB, errorCB);
	}

	writePWM(pwm, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(pwmUuid)) {
			if (errorCB) errorCB();
			return;
		}
		console.log("Set pwm to " + pwm);
		this.ble.writePWM(this.targetAddress, pwm, successCB, errorCB);
	}

	connectAndWritePWM(address, pwm, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.writePWM(pwm, successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	readPWM(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(pwmUuid)) {
			if (errorCB) errorCB();
			return;
		}
		console.log("Reading current PWM value");
		this.ble.readPWM(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	connectAndReadPWM(address, successCB, errorCB) {
		function func(successCB, errorCB) {
			this.readPWM(successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
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
			if (errorCB) errorCB();
			return;
		}
		var self = this;
		this.ble.sampleCurrent(
			this.targetAddress,
			0x01,
			function() {
				setTimeout(
					function() {
						self.ble.readCurrentConsumption(self.targetAddress, successCB); //TODO: should have an errorCB
					},
					100
				);
			}
		); // TODO: should have an errorCB
	}

	readCurrentCurve(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(sampleCurrentUuid) ||
			!this.characteristics.hasOwnProperty(currentCurveUuid)) {
			if (errorCB) errorCB();
			return;
		}
		var self = this;
		this.ble.sampleCurrent(
			this.targetAddress,
			0x02,
			function() {
				setTimeout(
					function() {
						self.ble.getCurrentCurve(self.targetAddress, successCB); //TODO: should have an errorCB
					},
					100
				);
			}
		); // TODO: should have an errorCB
	}

	writeCurrentLimit(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(currentLimitUuid)) {
			if (errorCB) errorCB();
			return;
		}
		console.log("TODO");
		//this.ble.writeCurrentLimit(this.targetAddress, value)
	}

	readCurrentLimit(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(currentLimitUuid)) {
			if (errorCB) errorCB();
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
			if (errorCB) errorCB();
			return;
		}
		this.ble.readTemperature(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeMeshMessage(obj, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(meshCharacteristicUuid)) {
			if (errorCB) errorCB();
			return;
		}
		console.log("Send mesh message: ", obj);
		this.ble.writeMeshMessage(this.targetAddress, obj, successCB, errorCB)
	}

	hasConfigurationCharacteristics() {
		return this.characteristics.hasOwnProperty(selectConfigurationCharacteristicUuid) &&
			this.characteristics.hasOwnProperty(getConfigurationCharacteristicUuid) &&
			this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid);
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
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	readConfiguration(configurationType, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(selectConfigurationCharacteristicUuid) ||
			!this.characteristics.hasOwnProperty(getConfigurationCharacteristicUuid)) {
			console.log("Missing characteristic UUID");
			if (errorCB) errorCB();
			return;
		}
		this.ble.getConfiguration(this.targetAddress, configurationType, successCB, errorCB);
	}

	// TODO writing/reading configs, should be replaced with a functions to convert value object to a config object and then call writeConfiguration

	readDeviceName(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getDeviceName(this.targetAddress, successCB, errorCB);
	}

	writeDeviceName(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setDeviceName(this.targetAddress, value, successCB, errorCB);
	}

	readBeaconMajor(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getBeaconMajor(this.targetAddress, successCB, errorCB);
	}

	writeBeaconMajor(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setBeaconMajor(this.targetAddress, value, successCB, errorCB);
	}

	readBeaconMinor(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getBeaconMinor(this.targetAddress, successCB, errorCB);
	}

	writeBeaconMinor(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setBeaconMinor(this.targetAddress, value, successCB, errorCB);
	}

	readBeaconUuid(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getBeaconUuid(this.targetAddress, successCB, errorCB);
	}

	writeBeaconUuid(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setBeaconUuid(this.targetAddress, value, successCB, errorCB);
	}

	readBeaconRssi(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getBeaconRssi(this.targetAddress, successCB, errorCB);
	}

	writeBeaconRssi(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setBeaconRssi(this.targetAddress, value, successCB, errorCB);
	}

	readDeviceType(successCB, errorCB) {
		// if (!this.hasConfigurationCharacteristics()) {
		// 	if (errorCB) errorCB();
		// 	return;
		// }
		// this.ble.getDeviceType(this.targetAddress, successCB, errorCB);
	}

	writeDeviceType(value, successCB, errorCB) {
		// if (!this.hasConfigurationCharacteristics()) {
		// 	if (errorCB) errorCB();
		// 	return;
		// }
		// this.ble.setDeviceType(this.targetAddress, value, successCB, errorCB);
	}

	readFloor(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getFloor(this.targetAddress, successCB, errorCB);
	}

	writeFloor(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setFloor(this.targetAddress, value, successCB, errorCB);
	}

	readRoom(successCB, errorCB) {
		// if (!this.hasConfigurationCharacteristics()) {
		// 	if (errorCB) errorCB();
		// 	return;
		// }
		// this.ble.getRoom(this.targetAddress, successCB, errorCB);
	}

	writeRoom(value, successCB, errorCB) {
		// if (!this.hasConfigurationCharacteristics()) {
		// 	if (errorCB) errorCB();
		// 	return;
		// }
		// this.ble.setRoom(this.targetAddress, value, successCB, errorCB);
	}

	// TODO: value should be an object with ssid and pw
	writeWifi(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
			if (errorCB) errorCB();
			return;
		}
		console.log("Set wifi to " + value);
		this.ble.setWifi(this.targetAddress, value, successCB, errorCB);
	}

	// TODO: value should be an object with ssid and pw
	connectAndWriteWifi(address, value, successCB, errorCB) {
		//function func(successCB, errorCB) {
		//	this.writeWifi(value, successCB, errorCB);
		//}
		//this.connectExecuteAndDisconnect(address, generalServiceUuid, setConfigurationCharacteristicUuid, func.bind(this), successCB, errorCB);
		var self = this;
		function func(successCB, errorCB) {
			self.writeWifi(value, successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	readIp(successCB, errorCB) {
		this.readConfiguration(configWifiUuid, successCB, errorCB);
	}

	// TODO: should we also discover selectConfigurationCharacteristicUuid ? Seems like we're just lucky now.
	connectAndReadIp(address, successCB, errorCB) {
		var self = this;
		function func(successCB, errorCB) {
			self.readIp(successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	//////////////////////////
	// Localization service //
	//////////////////////////

	readTrackedDevices(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(deviceListUuid)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeTrackedDevice(deviceAddress, rssiThreshold, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(addTrackedDeviceUuid)) {
			if (errorCB) errorCB();
			return;
		}
		console.log("TODO");
	}

	readScannedDevices(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(deviceListUuid)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeScanDevices(scan : boolean, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(deviceScanUuid)) {
			if (errorCB) errorCB();
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
				setTimeout(stopScanAndReadResult.bind(this), 10000);
			},
			errorCB);

		// Stop scanning and read result
		var stopScanAndReadResult = function () {
			this.writeScanDevices(
				false,
				this.readScannedDevices(successCB, errorCB),
				errorCB
			);
		}
	}

}
