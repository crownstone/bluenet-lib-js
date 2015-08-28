// TODO: sort ascending / descending

// TODO: import instead of reference
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
		//	BleUtils.debug("Must supply an array!");
		//	return;
		//}
		this.scanFilter = filter;
	}

	checkState(checkState) {
		return this.state == checkState;
	}

	startScan(scanCB, errorCB) {
		if (!this.checkState(BleState.initialized)) {
			BleUtils.debug("State must be \"initialized\"");
			// todo: errorCB
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
		BleUtils.debug("Connect");
		var self = this;

		if (this.checkState(BleState.initialized)) {
			BleUtils.debug("connecting ...");

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
						self.onDisconnect();
						if (errorCB) errorCB();
					}
				}
			);
		}
		else if (this.checkState(BleState.connected) && this.targetAddress == address) {
			BleUtils.debug("already connected");
			self.onConnect();
			if (successCB) successCB();
		}
		else {
			BleUtils.debug("wrong state");
			if (errorCB) errorCB("Not in correct state to connect and not connected to " + address);
		}
	}

	disconnect(successCB, errorCB) {
		BleUtils.debug("Disconnect");
		var self = this;
		this.ble.disconnectDevice(
			this.targetAddress,
			function() {
				self.onDisconnect();
				if (successCB) successCB();
			},
			function() {
				BleUtils.debug("Assuming we are disconnected anyway");
				if (errorCB) errorCB();
			}
		);
	}

	close(successCB, errorCB) {
		BleUtils.debug("Close");
		this.ble.closeDevice(this.targetAddress, successCB, errorCB);
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

	hasCharacteristic(characteristic) {
		console.log("characteristics: " + JSON.stringify(this.characteristics))
		return this.characteristics.hasOwnProperty(characteristic);
	}

	// Called on successful connect
	onConnect() {
		BleUtils.debug("onConnect");
		this.state = BleState.connected;
		if (this.disconnectTimeout != null) {
			clearTimeout(this.disconnectTimeout);
		}
		if (this.onConnectCallback) this.onConnectCallback();
	}

	onDisconnect() {
		BleUtils.debug("onDisconnect");
		this.state = BleState.initialized;
		if (this.disconnectTimeout != null) {
			clearTimeout(this.disconnectTimeout);
		}
		//this.targetAddress = "";
		this.characteristics = {};
	}

	onCharacteristicDiscover(serviceUuid, characteristicUuid) {
		BleUtils.debug("Discovered characteristic: " + characteristicUuid);
		// to be checked: this might not work with the characteristics defined by
		// the Bluetooth Consortium the characteristics seem to have the same Uuid
		// in different services??
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
			this.discoverServices(
				characteristicCB,
				successCB,
				function(msg) {
					BleUtils.debug(msg);
					this.disconnect();
					if (errorCB) errorCB(msg);
				}.bind(this)
			);
		};

		this.connect(
			address,
//			timeout,
			connectionSuccess.bind(this),
			errorCB
		);
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
		BleUtils.debug("Toggle power");
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
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_PWM_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("Set pwm to " + pwm);
		this.ble.writePWM(this.targetAddress, pwm, successCB, errorCB);
	}

	connectAndWritePWM(address, pwm, successCB, errorCB) {
		function func(funcSuccessCB, funcErrorCB) {
			this.writePWM(pwm, funcSuccessCB, funcErrorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	readPWM(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_PWM_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("Reading current PWM value");
		this.ble.readPWM(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	connectAndReadPWM(address, successCB, errorCB) {
		function func(funcSuccessCB, funcErrorCB) {
			this.readPWM(funcSuccessCB, funcErrorCB);
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
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_SAMPLE_CURRENT_UUID) ||
			!this.characteristics.hasOwnProperty(BleTypes.CHAR_CURRENT_CONSUMPTION_UUID)) {
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
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_SAMPLE_CURRENT_UUID) ||
			!this.characteristics.hasOwnProperty(BleTypes.CHAR_CURRENT_CURVE_UUID)) {
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
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_CURRENT_LIMIT_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("TODO");
		//this.ble.writeCurrentLimit(this.targetAddress, value)
	}

	readCurrentLimit(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_CURRENT_LIMIT_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("TODO");
		this.ble.readCurrentLimit(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	////////////////////////////////
	// Device Information Service //
	////////////////////////////////

	readHardwareRevision(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_HARDWARE_REVISION_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.readHardwareRevision(this.targetAddress, successCB, errorCB);
	}

	readFirmwareRevision(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_FIRMWARE_REVISION_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.readFirmwareRevision(this.targetAddress, successCB, errorCB);
	}

	/////////////////////
	// General service //
	/////////////////////

	reset(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_RESET_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		var self = this;
		this.ble.writeReset(this.targetAddress, value,
			function() {
				self.disconnect(successCB, errorCB);
			},
			errorCB
		);
	}

	resetDevice(successCB, errorCB) {
		this.reset(BleTypes.RESET_DEFAULT, successCB, errorCB);
	}

	resetToBootloader(successCB, errorCB) {
		this.reset(BleTypes.RESET_BOOTLOADER, successCB, errorCB);
	}

	// DFU Mode
	resetToApplication(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_CONTROL_POINT_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		var self = this;
		this.ble.dfuReset(this.targetAddress, 0x06,
			function() {
				self.onDisconnect();
				successCB();
			},
			errorCB
		);
	}

	readTemperature(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_TEMPERATURE_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.readTemperature(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeMeshMessage(obj, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_MESH_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("Send mesh message: " + obj);
		this.ble.writeMeshMessage(this.targetAddress, obj, successCB, errorCB)
	}

	hasConfigurationCharacteristics() {
		return this.characteristics.hasOwnProperty(BleTypes.CHAR_SELECT_CONFIGURATION_UUID) &&
			this.characteristics.hasOwnProperty(BleTypes.CHAR_GET_CONFIGURATION_UUID) &&
			this.characteristics.hasOwnProperty(BleTypes.CHAR_SET_CONFIGURATION_UUID);
	}

	writeConfiguration(obj, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_SET_CONFIGURATION_UUID)) {
			return;
		}
		BleUtils.debug("Set config");
		this.ble.writeConfiguration(this.targetAddress, obj, successCB, errorCB);
	}

	connectAndWriteConfiguration(address, config, successCB, errorCB) {
		function func(funcSuccessCB, funcErrorCB) {
			this.writeConfiguration(config, funcSuccessCB, funcErrorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	readConfiguration(configurationType, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_SELECT_CONFIGURATION_UUID) ||
			!this.characteristics.hasOwnProperty(BleTypes.CHAR_GET_CONFIGURATION_UUID)) {
			BleUtils.debug("Missing characteristic UUID");
			if (errorCB) errorCB();
			return;
		}
		this.ble.getConfiguration(this.targetAddress, configurationType, successCB, errorCB);
	}

	// TODO? writing/reading configs, should be replaced with a functions to convert value object to a config object and then call writeConfiguration

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

	readBeaconProximityUuid(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getBeaconProximityUuid(this.targetAddress, successCB, errorCB);
	}

	writeBeaconProximityUuid(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setBeaconProximityUuid(this.targetAddress, value, successCB, errorCB);
	}

	readBeaconCalibratedRssi(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getBeaconCalibratedRssi(this.targetAddress, successCB, errorCB);
	}

	writeBeaconCalibratedRssi(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setBeaconCalibratedRssi(this.targetAddress, value, successCB, errorCB);
	}

	readDeviceType(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getDeviceType(this.targetAddress, successCB, errorCB);
	}

	writeDeviceType(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setDeviceType(this.targetAddress, value, successCB, errorCB);
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
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getRoom(this.targetAddress, successCB, errorCB);
	}

	writeRoom(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setRoom(this.targetAddress, value, successCB, errorCB);
	}

	readTxPower(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getTxPower(this.targetAddress, successCB, errorCB);
	}

	writeTxPower(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setTxPower(this.targetAddress, value, successCB, errorCB);
	}

	readAdvertisementInterval(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getAdvertisementInterval(this.targetAddress, successCB, errorCB);
	}

	writeAdvertisementInterval(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setAdvertisementInterval(this.targetAddress, value, successCB, errorCB);
	}

	readMinEnvTemp(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getMinEnvTemp(this.targetAddress, successCB, errorCB);
	}

	writeMinEnvTemp(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setMinEnvTemp(this.targetAddress, value, successCB, errorCB);
	}

	readMaxEnvTemp(successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getMaxEnvTemp(this.targetAddress, successCB, errorCB);
	}

	writeMaxEnvTemp(value, successCB, errorCB) {
		if (!this.hasConfigurationCharacteristics()) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.setMaxEnvTemp(this.targetAddress, value, successCB, errorCB);
	}

	// TODO: value should be an object with ssid and pw
	writeWifi(value, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_SET_CONFIGURATION_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("Set wifi to " + value);
		this.ble.setWifi(this.targetAddress, value, successCB, errorCB);
	}

	// TODO: value should be an object with ssid and pw
	connectAndWriteWifi(address, value, successCB, errorCB) {
		//function func(successCB, errorCB) {
		//	this.writeWifi(value, successCB, errorCB);
		//}
		//this.connectExecuteAndDisconnect(address, GENERAL_SERVICE_UUID, CHAR_SET_CONFIGURATION_UUID, func.bind(this), successCB, errorCB);
		var self = this;
		function func(successCB, errorCB) {
			self.writeWifi(value, successCB, errorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	readIp(successCB, errorCB) {
		this.readConfiguration(BleTypes.CONFIG_TYPE_WIFI, successCB, errorCB);
	}

	// TODO: should we also discover CHAR_SELECT_CONFIGURATION_UUID ? Seems like we're just lucky now.
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
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_LIST_TRACKED_DEVICES_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.getTrackedDevices(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeTrackedDevice(deviceAddress, rssiThreshold, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_ADD_TRACKED_DEVICE_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("TODO");
	}

	readScannedDevices(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_DEVICE_LIST_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
	}

	writeScanDevices(scan : boolean, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_DEVICE_SCAN_UUID)) {
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

	////////////////////////////////
	// Schedule Service //
	////////////////////////////////

	writeCurrentTime(posixTime, successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_CURRENT_TIME_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("Set current time to " + posixTime);
		this.ble.writeCurrentTime(this.targetAddress, posixTime, successCB, errorCB);
	}

	readCurrentTime(successCB, errorCB) {
		if (!this.characteristics.hasOwnProperty(BleTypes.CHAR_CURRENT_TIME_UUID)) {
			if (errorCB) errorCB();
			return;
		}
		BleUtils.debug("Reading current time");
		this.ble.readCurrentTime(this.targetAddress, successCB, errorCB);
	}

	syncTime(successCB, errorCB) {
		var posixTime = Math.round(Date.now() / 1000);
		this.writeCurrentTime(posixTime, successCB, errorCB);
	}

	connectAndWriteCurrentTime(address, posixTime, successCB, errorCB) {
		function func(funcSuccessCB, funcErrorCB) {
			this.writeCurrentTime(posixTime, funcSuccessCB, funcErrorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	connectAndReadCurrentTime(address, successCB, errorCB) {
		function func(funcSuccessCB, funcErrorCB) {
			this.readCurrentTime(funcSuccessCB, funcErrorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

	connectAndSyncTime(address, successCB, errorCB) {
		function func(funcSuccessCB, funcErrorCB) {
			this.syncCurrentTime(funcSuccessCB, funcErrorCB);
		}
		this.connectExecuteAndDisconnect(address, func, successCB, errorCB);
	}

}


