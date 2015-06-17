/// <reference path="ble-types.ts"/>
/// <reference path="ble-utils.ts"/>

declare var bluetoothle;
//declare var navigator;

interface Navigator { notification: any; }

class BleConfigurationMessage {
	type : number;
	length : number;
	payload : Uint8Array;
}

var BleBase = function() {
	var self = this;
	var addressKey = 'address';
	var dobotsCompanyId = 0x1111; // has to be defined, this is only a dummy value

	var scanTimer = null;
	var connectTimer = null;
	var reconnectTimer = null;

	var iOSPlatform = "iOS";
	var androidPlatform = "Android";

	self.init = function(callback) {
		console.log("Initialize BLE hardware");
		bluetoothle.initialize(
			function(obj) {
				console.log('Properly connected to BLE chip');
				// console.log("Message " + JSON.stringify(obj));
				if (obj.status == 'enabled') {
					callback(true);
				}
			},
			function(obj) {
				console.log('Connection to BLE chip failed');
				console.log('Message' + obj.status);
				navigator.notification.alert(
						'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
						null,
						'BLE off?',
						'Sorry!');
				callback(false);
			},
			{"request": true}
		);
	}

	self.isConnected = function(address) {
		if (!address) return false;
		var paramsObj = {"address": address};
		var connected;
		bluetoothle.isConnected(connected, paramsObj);
		return connected;
	}

	self.reconnectDevice = function(address, timeout, callback) {
		console.log("Beginning to reconnect to " + address + " with " + timeout + " second timeout");
		var paramsObj = {"address": address};
		bluetoothle.reconnect(function(obj) { // reconnectSuccess
				if (obj.status == "connected") {
					console.log("Reconnected to: " + obj.name + " - " + obj.address);

					self.clearReconnectTimeout();

					if (callback) {
						callback(true);
					}

				}
				else if (obj.status == "connecting") {
					console.log("Reconnecting to: " + obj.name + " - " + obj.address);
				}
				else {
					console.log("Unexpected reconnect status: " + obj.status);
					self.clearReconnectTimeout();
					self.closeDevice(obj.address);
					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // reconnectError
				console.log("Reconnect error: " + obj.error + " - " + obj.message);
				self.clearReconnectTimeout();
				if (callback) {
					callback(false);
				}
			},
			paramsObj);

		self.reconnectTimer = setTimeout(function() { // connectTimeout
				console.log('Connection timed out, stop connection attempts');
				if (callback) {
					callback(false);
				}
			},
			timeout * 1000);
	}

	self.clearReconnectTimeout = function() {
		console.log("Clearing reconnect timeout");
		if (self.reconnectTimer != null) {
			clearTimeout(self.reconnectTimer);
		}
	}

	self.connectDevice = function(address, timeout, callback) {
		console.log("Beginning to connect to " + address + " with " + timeout + " second timeout");
		var paramsObj = {"address": address};
		bluetoothle.connect(function(obj) { // connectSuccess
				if (obj.status == "connected") {
					console.log("Connected to: " + obj.name + " [" + obj.address + "]");

					self.clearConnectTimeout();

					if (callback) {
						callback(true);
					}

				}
				else if (obj.status == "connecting") {
					console.log("Connecting to: " + obj.name + " [" + obj.address + "]");
				}
				else {
					console.log("Unexpected connect status: " + obj.status);
					self.clearConnectTimeout();
					self.closeDevice(obj.address);
					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // connectError
				console.log("Connect error: " + obj.error + " - " + obj.message);
				// for now we are gonna attempt a reconnect
				if (obj.error == 'connect') {
					// console.log("Attempt a disconnect, a reconnect didn't work");
				//	self.reconnectDevice(address, timeout, callback);
					// self.disconnectDevice(address);
					console.log("close device, try again...");
					self.closeDevice(address);
				} else {
					self.clearConnectTimeout();
					if (callback) {
						callback(false);
					}
				}
			},
			paramsObj);

		self.connectTimer = setTimeout(function() { // connectTimeout
				console.log('Connection timed out, stop connection attempts');
				if (callback) {
					callback(false);
				}
			},
			timeout * 1000);
	}

	self.clearConnectTimeout = function() {
		console.log("Clearing connect timeout");
		if (self.connectTimer != null) {
			clearTimeout(self.connectTimer);
		}
	}

	/** Discovery of services and characteristics on the target device (crownstone).
	 *
	 * Discovery must be run before any of the getters/setters can be used. Or else "Service not found" errors
	 * will be generated.
	 */
	self.discoverServices = function(address, callback, successCB, errorCB) {
		console.log("Beginning discovery of services for device" + address);
		var paramsObj = {address: address};
		bluetoothle.discover(function(obj) { // discover success
				if (obj.status == "discovered") {
					console.log("Discovery completed");
					if (callback) {
						var services = obj.services;
						for (var i = 0; i < services.length; ++i) {
							var serviceUuid = services[i].serviceUuid;
							var characteristics = services[i].characteristics;
							for (var j = 0; j < characteristics.length; ++j) {
								var characteristicUuid = characteristics[j].characteristicUuid;
								console.log("Found service " + serviceUuid + " with characteristic " + characteristicUuid);

								callback(serviceUuid, characteristicUuid);
							}
						}
					}
					if (successCB) successCB(obj);
				}
				else {
					var msg = "Unexpected discover status: " + obj.status;
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // discover error
				var msg = "Discover error: " + obj.error + " - " + obj.message;
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	self.discoverCharacteristic = function(address, serviceUuid, characteristicUuid, callback, errorCB) {
		var paramsObj = {address: address};
		bluetoothle.discover(function(obj) { // discover success
				if (obj.status == "discovered")
				{
					var services = obj.services;
					var success = false;
					for (var i = 0; i < services.length; ++i) {
						var sUuid = services[i].serviceUuid;
						if (sUuid != serviceUuid) continue;
						var characteristics = services[i].characteristics;
						for (var j = 0; j < characteristics.length; ++j) {
							var cUuid = characteristics[j].characteristicUuid;
							if (cUuid != characteristicUuid) continue;
							success = true;
							if (success) break;
						}
						if (success) break;
					}
					if (success) {
						callback(serviceUuid, characteristicUuid);
					} else {
						var msg = "Could not find service " + serviceUuid +
							" or characteristic " + characteristicUuid;
						errorCB(msg);
					}
				}
				else
				{
					var msg = "Unexpected discover status: " + obj.status;
					errorCB(msg);
				}
			},
			function(obj) { // discover error
				var msg = "Discover error: " + obj.error + " - " + obj.message;
				errorCB(msg);
			},
			paramsObj);
	}

	self.startEndlessScan = function(callback) {
		console.log('Start endless scan');
		var paramsObj = {};
		bluetoothle.startScan(function(obj) {  // start scan success
				if (obj.status == 'scanResult') {
					// console.log('Found device, parse and call callback if company id == ' + dobotsCompanyId);
					var arr = bluetoothle.encodedStringToBytes(obj.advertisement);
					self.parseAdvertisement(arr, 0xFF, function(data) {
						var companyId = BleUtils.byteArrayToUint16(data, 0);
						if (companyId == BleTypes.APPLE_COMPANY_ID) {
							self.parseIBeaconData(obj, data);
						}
						if (companyId == dobotsCompanyId) {
							obj.isCrownstone = true;
						}
						callback(obj);
					})
				} else if (obj.status == 'scanStarted') {
					console.log('Endless scan was started successfully');
				} else {
					console.log('Unexpected start scan status: ' + obj.status);
					console.log('Stopping scan');
					self.stopEndlessScan();
				}
			},
			function(obj) { // start scan error
				console.log('Scan error, status: ' + obj.status);
				// navigator.notification.alert(
				// 		'Scan Error',
				// 		null,
				// 		'Status',
				// 		'Sorry!');
			},
			paramsObj);
	}

	self.stopEndlessScan = function() {
		//console.log("stop endless scan...");
		bluetoothle.stopScan(function(obj) { // stop scan success
				if (obj.status == 'scanStopped') {
					//console.log('Scan was stopped successfully');
				} else {
					console.log('Unexpected stop scan status: ' + obj.status);
				}
			},
			function(obj) { // stop scan error
				console.log('Stop scan error: ' + obj.error + ' - ' + obj.message);
			});
	}

	self.parseAdvertisement = function(obj, search, callback) {
		//var start = 0;
		//var end = obj.length;
		for (var i = 0; i < obj.length; ) {
			var el_len = obj[i];
			var el_type = obj[i+1];
			if (el_type == search) {
				var begin = i+2;
				var end = begin + el_len - 1;
				var el_data = obj.subarray(begin, end);
				callback(el_data);
				return;
			} else if (el_type == 0) {
				// console.log(search.toString(16) + " not found!");
				return;
			} else {
				i += el_len + 1;
			}
		}
	}

	self.parseIBeaconData = function(obj, data) {
		var companyId = data[0] | data[1] << 8; // little endian
		var advertisementId = data[2] << 8 | data[3]; // big endian
		if (companyId == BleTypes.APPLE_COMPANY_ID && advertisementId == BleTypes.IBEACON_ADVERTISEMENT_ID) {
			obj.isIBeacon = true;
			obj.proximityUuid = BleUtils.bytesToUuid(data.subarray(4, 20));
			obj.major = data[20] << 8 | data[21]; // big endian
			obj.minor = data[22] << 8 | data[23]; // big endian
			// make signed
			obj.txPower = BleUtils.unsignedToSignedByte(data[24]);
		} else {
			obj.isIBeacon = false;
		}
	}

	/*
	 * Contains bug: when a device is in "disconnecting" state, it will never be closed.
	 */
	self.disconnectDevice = function(address, successCB, errorCB) {
		var paramsObj = {"address": address}
		bluetoothle.disconnect(function(obj) { // disconnect success
				if (obj.status == "disconnected")
				{
					console.log("Device " + obj.address + " disconnected");
					self.closeDevice(obj.address);
					if (successCB) successCB();
				}
				else if (obj.status == "disconnecting")
				{
					console.log("Disconnecting device " + obj.address);
					//if (errorCB) errorCB();
				}
				else
				{
					console.log("Unexpected disconnect status from device " + obj.address + ": " + obj.status);
					if (errorCB) errorCB();
				}
			},
			function(obj) { // disconnect error
				console.log("Disconnect error from device " + obj.address + ": " + obj.error + " - " + obj.message);
				if (errorCB) errorCB();
			},
			paramsObj);
	}

	self.closeDevice = function(address)
	{
		var paramsObj = {"address": address};
		bluetoothle.close(function(obj)	{ // close success
				if (obj.status == "closed")
				{
					console.log("Device " + obj.address + " closed");
				}
				else
				{
					console.log("Unexpected close status from device " + obj.address + ": " + obj.status);
				}
			},
			function(obj) { // close error
				console.log("Close error from device " + obj.address + ": " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.readTemperature = function(address, callback) {
		console.log("Read temperature at service " + BleTypes.generalServiceUuid + ' and characteristic ' + BleTypes.temperatureCharacteristicUuid);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid, "characteristicUuid": BleTypes.temperatureCharacteristicUuid};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var temperature = bluetoothle.encodedStringToBytes(obj.value);
					console.log("temperature: " + temperature[0]);

					callback(temperature[0]);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading temperature: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.scanDevices = function(address, scan) {
		var u8 = new Uint8Array(1);
		u8[0] = scan ? 1 : 0;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.indoorLocalizationServiceUuid + ' and characteristic ' + BleTypes.deviceScanUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.indoorLocalizationServiceUuid, "characteristicUuid": BleTypes.deviceScanUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to device scan characteristic - ' + obj.status);
				} else {
					console.log('Writing to device scan characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				console.log("Error in writing device scan characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.listDevices = function(address, callback) {
		console.log("Read device list at service " + BleTypes.indoorLocalizationServiceUuid + ' and characteristic ' + BleTypes.deviceListUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.indoorLocalizationServiceUuid, "characteristicUuid": BleTypes.deviceListUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var list = bluetoothle.encodedStringToBytes(obj.value);
					console.log("list: " + list[0]);

					callback(list);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading device list: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.writePWM = function(address, value, successCB, errorCB) {
		var u8 = new Uint8Array(1);
		u8[0] = value;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.pwmUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.pwmUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to pwm characteristic - ' + obj.status);

					if (successCB) successCB();
				} else {
					console.log('Writing to pwm characteristic was not successful' + obj);

					if (errorCB) errorCB();
				}
			},
			function(obj) { // wrtie error
				console.log("Error in writing to pwm characteristic: " + obj.error + " - " + obj.message);

				if (errorCB) errorCB();
			},
			paramsObj);
	}

	// TODO: should have errorCB
	self.readPWM = function(address, callback) {
		console.log("Read current consumption at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.pwmUuid);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.pwmUuid};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var pwm = bluetoothle.encodedStringToBytes(obj.value);
					console.log("pwm: " + pwm[0]);

					callback(pwm[0]);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading current consumption: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	// TODO: should have errorCB
	self.readCurrentConsumption = function(address, callback) {
		console.log("Read current consumption at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.currentConsumptionUuid);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.currentConsumptionUuid};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var currentConsumption = bluetoothle.encodedStringToBytes(obj.value);
					console.log("currentConsumption: " + currentConsumption[0]);

					callback(currentConsumption[0]);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading current consumption: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	// TODO: should have errorCB
	self.sampleCurrent = function(address, value, callback) {
		var u8 = new Uint8Array(1);
		u8[0] = value;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.sampleCurrentUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.sampleCurrentUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to sample current characteristic - ' + obj.status);

					if (callback) {
						callback(true)
					}
				} else {
					console.log('Writing to sample current characteristic was not successful' + obj);

					if (callback) {
						callback(false)
					}
				}
			},
			function(obj) { // write error
				console.log("Error in writing to sample current characteristic: " + obj.error + " - " + obj.message);

				if (callback) {
					callback(false)
				}
			},
			paramsObj);
	}

	// TODO: should have errorCB
	self.getCurrentCurve = function(address, callback) {
		console.log("Read current curve at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.currentCurveUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.currentCurveUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var arr8 = bluetoothle.encodedStringToBytes(obj.value);
					console.log(JSON.stringify(arr8));
					if (arr8.length < 2) {
						console.log("Invalid current curve data (too short): ");
						console.log(JSON.stringify(arr8));
						return;
					}
					callback(arr8);


					//if (arr8.length < 2) {
						//console.log("Invalid current curve data (too short): ");
						//console.log(JSON.stringify(arr8));
						//return;
					//}
					//var size = (arr8[0] << 8) + arr8[1];
					//if (size != arr8.length/2-1) {
						//console.log("Invalid current curve data (size mismatch): ");
						//console.log(JSON.stringify(arr8));
						//return;
					//}
					//if (size < 1) {
						//return;
					//}

					//var arr16 = new Uint16Array(size);
					//for (var i=0; i<size; ++i) {
						//// arr16[i] = (arr8[2*i+2] << 8) + arr8[2*i+3];
						//arr16[i] = (arr8[2*i+2] << 8) + arr8[2*i+3];
					//}
					//var arrStr = "";
					//for (var i=0; i<size; ++i) {
						//arrStr = arrStr + " " + arr16[i];
					//}
					//console.log("Result:" + arrStr);

					//callback(arr16);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading current curve: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	/* set floor to value
	 */
	self.setFloor = function(address, value, successCB, errorCB) {
		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configFloorUuid;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	/** Get a floor from the connected device
	 */
	self.getFloor = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.configFloorUuid,
			function(configuration) {
				if (configuration.length != 1) {
					var msg = "Configuration value for floor level should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var floor = configuration.payload[0];
					console.log("Floor is set to: " + floor);
					if (successCB) successCB(floor);
				}
			},
			errorCB);
	}

	// TODO: should be writeWifi()
	/* Set Wifi SSID and password
	 */
	self.setWifi = function(address, value, successCB, errorCB) {
		var u8;
		if (value != "") {
			u8 = bluetoothle.stringToBytes(value);
		} else {
			var msg = "Value shouldn't be empty";
			if (errorCB) errorCB(msg);
		}

		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configWifiUuid;
		configuration.length = value.length; // TODO: should be u8.length?
		configuration.payload = u8;
		console.log("Send payload: " + u8);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	self.setBeaconMajor = function(address, value, successCB, errorCB) {
		console.log("set major to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configIBeaconMajorUuid;
		configuration.length = 2;
		configuration.payload = BleUtils.uint16ToByteArray(value);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	self.getBeaconMajor = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.configIBeaconMajorUuid,
			function(configuration) {
				if (configuration.length > 2) {
					var msg = "Configuration value for major should have length 2";
					if (errorCB) errorCB(msg);
				} else {
					var major = BleUtils.byteArrayToUint16(configuration.payload, 0);
					console.log("Major is set to: " + major);
					if (successCB) successCB(major);
				}
			},
			errorCB
		);
	}

	self.setBeaconMinor = function(address, value, successCB, errorCB) {
		console.log("set minor to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configIBeaconMinorUuid;
		configuration.length = 2;
		configuration.payload = BleUtils.uint16ToByteArray(value);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	self.getBeaconMinor = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.configIBeaconMinorUuid,
			function(configuration) {
				if (configuration.length > 2) {
					var msg = "Configuration value for minor should have length 2";
					if (errorCB) errorCB(msg);
				} else {
					var minor = BleUtils.byteArrayToUint16(configuration.payload, 0);
					console.log("Minor is set to: " + minor);
					if (successCB) successCB(minor);
				}
			},
			errorCB
		);
	}

	self.setBeaconRssi = function(address, value, successCB, errorCB) {
		console.log("set rssi to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configIBeaconRssiUuid;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	self.getBeaconRssi = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.configIBeaconRssiUuid,
			function(configuration) {
				if (configuration.length > 1) {
					var msg = "Configuration value for rssi should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var rssi = BleUtils.unsignedToSignedByte(configuration.payload[0]);
					console.log("Rssi is set to: " + rssi);
					if (successCB) successCB(rssi);
				}
			},
			errorCB
		);
	}

	self.setBeaconUuid = function(address, value, successCB, errorCB) {
		console.log("set uuid to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configIBeaconUuidUuid;
		configuration.payload = BleUtils.uuidToBytes(value);
		configuration.length = configuration.payload.length;
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	self.getBeaconUuid = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.configIBeaconUuidUuid,
			function(configuration) {
				if (configuration.length > 16) {
					var msg = "Configuration value for uuid should have length 16";
					if (errorCB) errorCB(msg);
				} else {
					var uuid = BleUtils.bytesToUuid(configuration.payload);
					console.log("Uuid is set to: " + uuid);
					if (successCB) successCB(uuid);
				}
			},
			errorCB
		);
	}

	self.setDeviceName = function(address, value, successCB, errorCB) {
		console.log("set name to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.configNameUuid;
		configuration.payload = bluetoothle.stringToBytes(value);
		configuration.length = configuration.payload.length;
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	self.getDeviceName = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.configNameUuid,
			function(configuration) {
				if (configuration.length == 0) {
					if (errorCB) errorCB("received empty name");
				} else {
					var name = bluetoothle.bytesToString(configuration.payload);
					console.log("Name is set to: " + name);
					if (successCB) successCB(name);
				}
			},
			errorCB
		);
	}

	/** Select and read configuration
	 */
	self.getConfiguration = function(address, configurationType, successCB, errorCB) {
		self.selectConfiguration(
			address,
			configurationType,
			function() {
				self.readConfiguration(address, successCB, errorCB);
			},
			errorCB
			);
	}



	/** Get a specific configuration, selected before in selectConfiguration
	 */
	self.readConfiguration = function(address, successCB, errorCB) {
		console.log("Read configuration at service " + BleTypes.generalServiceUuid +
				' and characteristic ' + BleTypes.getConfigurationCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid,
			"characteristicUuid": BleTypes.getConfigurationCharacteristicUuid};
		bluetoothle.read(
			function(obj) { // read success
				if (obj.status == "read") {
					var bytearray = bluetoothle.encodedStringToBytes(obj.value);
					//var configuration = {};
					var configuration = new BleConfigurationMessage;
					configuration.type = bytearray[0];
					configuration.length = BleUtils.byteArrayToUint16(bytearray, 2);
					configuration.payload = new Uint8Array(configuration.length);
					for (var i = 0; i < configuration.length; i++) {
						configuration.payload[i] = bytearray[i+4];
					}
					console.log("Read configuration: " + JSON.stringify(configuration));
					if (successCB) successCB(configuration);
				}
				else {
					var msg = "Unexpected read status: " + obj.status;
					console.log(msg);
					if (errorCB) errorCB();
				}
			},
			function(obj) { // read error
				var msg = 'Error in reading "get configuration" characteristic' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	/** Writing a configuration
	 *
	 */
	self.writeConfiguration = function(address, configuration, successCB, errorCB) {

		console.log("Write to " + address + " configuration type " + configuration.type);

		// build up a single byte array, prepending payload with type and payload length, preamble size is 4
		var u8 = new Uint8Array(configuration.length+4);
		u8[0] = configuration.type;
		u8[1] = BleTypes.RESERVED;
		u8[2] = (configuration.length & 0xFF); // endianness: least significant byte first
		u8[3] = ((configuration.length >> 8) & 0xFF);
		u8.set(configuration.payload, 4);

		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.generalServiceUuid +
				' and characteristic ' + BleTypes.setConfigurationCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid,
			"characteristicUuid": BleTypes.setConfigurationCharacteristicUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "write configuration" characteristic - ' +
						obj.status;
					console.log(msg);
					if (successCB) setTimeout(function() { successCB(msg)}, 500);
				} else {
					var msg = 'Error in writing to "write configuration" characteristic - ' +
						obj;
					console.log(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "write configuration" characteristic - ' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	/** Before getting the value of a specific configuration type, we have to select it.
	 */
	self.selectConfiguration = function(address, configurationType, successCB, errorCB) {
		var u8 = new Uint8Array(1);
		u8[0] = configurationType;

		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.generalServiceUuid +
				' and characteristic ' + BleTypes.selectConfigurationCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid,
			"characteristicUuid": BleTypes.selectConfigurationCharacteristicUuid , "value" : v};
		bluetoothle.write(
			function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "select configuration" characteristic - ' +
						obj.status;
					console.log(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to "select configuration" characteristic - ' +
						obj;
					console.log(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "select configuration" characteristic - ' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	/** Send a message over the mesh network
	 * message needs the following properties:
	 * .channel: there are several channels to use
	 * .target: bluetooth address (6 bytes) of target of this message. Use all zeroes for broadcast.
	 * .type: what type of message this is
	 * .length: length of payload
	 * .payload: data to be sent
	 */
	self.writeMeshMessage = function(address, message, successCB, errorCB) {

		message.length += 8 // Add length of target address and length of message type
		// build up a single byte array, prepending payload with type and payload length, preamble size is 4
		var u8 = new Uint8Array(message.length+12);
		u8[0] = message.channel;
		u8[1] = BleTypes.RESERVED;
		u8[2] = (message.length & 0xFF); // endianness: least significant byte first
		u8[3] = (message.length >> 8 & 0xFF);

		if (message.target.length != 6) {
			console.log("invalid bluetooth address ", message.target);
			return;
		}
		u8.set(message.target, 4); // bluetooth address of target crownstone: 6 bytes
		u8[10] = (message.type & 0xFF); // endianness: least significant byte first
		u8[11] = (message.type >> 8 & 0xFF);
		u8.set(message.payload, 12);

		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.generalServiceUuid +
				' and characteristic ' + BleTypes.meshCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid,
			"characteristicUuid": BleTypes.meshCharacteristicUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "mesh" characteristic - ' + obj.status;
					console.log(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to "mesh" characteristic - ' + obj;
					console.log(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "mesh" characteristic - ' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	// TODO: doesn't exist anymore
	self.writeDeviceType = function(address, value) {
		var u8 = bluetoothle.stringToBytes(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.generalServiceUuid + ' and characteristic ' + BleTypes.deviceTypeUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid, "characteristicUuid": BleTypes.deviceTypeUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to device type characteristic - ' + obj.status);
				} else {
					console.log('Writing to device type characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				console.log("Error in writing to device type characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	// TODO: doesn't exist anymore
	self.readDeviceType = function(address, callback) {
		console.log("Read device type at service " + BleTypes.generalServiceUuid + ' and characteristic ' + BleTypes.deviceTypeUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid, "characteristicUuid": BleTypes.deviceTypeUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var deviceType = bluetoothle.encodedStringToBytes(obj.value);
					var deviceTypeStr = bluetoothle.bytesToString(deviceType);
					console.log("deviceType: " + deviceTypeStr);

					callback(deviceTypeStr);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading device type characteristic: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	// TODO: doesn't exist anymore
	self.writeRoom = function(address, value) {
		var u8 = bluetoothle.stringToBytes(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.generalServiceUuid + ' and characteristic ' + BleTypes.roomUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid, "characteristicUuid": BleTypes.roomUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to room characteristic - ' + obj.status);
				} else {
					console.log('Writing to room characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				console.log("Error in writing to room characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	// TODO: doesn't exist anymore
	self.readRoom = function(address, callback) {
		console.log("Read room at service " + BleTypes.generalServiceUuid + ' and characteristic ' + BleTypes.roomUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.generalServiceUuid, "characteristicUuid": BleTypes.roomUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var room = bluetoothle.encodedStringToBytes(obj.value);
					var roomStr = bluetoothle.bytesToString(room);
					console.log("room: " + roomStr);

					callback(roomStr);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading room characteristic: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.writeCurrentLimit = function(address, value) {
		var u8 = new Uint8Array(1);
		u8[0] = value & 0xFF;
		// u8[1] = (value >> 8) & 0xFF;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.currentLimitUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.currentLimitUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to current limit characteristic - ' + obj.status);
				} else {
					console.log('Writing to current limit characteristic was not successful' + obj);
				}
			},
			function(obj) { // write errror
				console.log("Error in writing to current limit characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.readCurrentLimit = function(address, callback) {
		console.log("Read current limit at service " + BleTypes.powerServiceUuid + ' and characteristic ' + BleTypes.currentLimitUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.powerServiceUuid, "characteristicUuid": BleTypes.currentLimitUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var currentLimit = bluetoothle.encodedStringToBytes(obj.value);
					console.log("current limit: " + currentLimit[0]);

					var value = currentLimit[0];

					callback(value);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading current limit characteristic: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.getTrackedDevices = function(address, callback) {
		console.log("Read device list at service " + BleTypes.indoorLocalizationServiceUuid + ' and characteristic ' + BleTypes.listTrackedDevicesUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.indoorLocalizationServiceUuid, "characteristicUuid": BleTypes.listTrackedDevicesUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var list = bluetoothle.encodedStringToBytes(obj.value);
					console.log("list: " + list[0]);

					callback(list);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading tracked devices: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.addTrackedDevice = function(address, bt_address, rssi) {
		var u8 = new Uint8Array(7);
		for (var i = 0; i < 6; i++) {
			u8[i] = parseInt(bt_address[i], 16);
			console.log("i: " + u8[i]);
		}
		u8[6] = rssi;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + BleTypes.indoorLocalizationServiceUuid + ' and characteristic ' + BleTypes.addTrackedDeviceUuid );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.indoorLocalizationServiceUuid, "characteristicUuid": BleTypes.addTrackedDeviceUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to add tracked device characteristic - ' + obj.status);
				} else {
					console.log('Writing to add tracked device characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				console.log("Error in writing to add tracked device characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}
}

