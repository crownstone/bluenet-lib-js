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
		BleUtils.debug("Initialize BLE hardware");
		bluetoothle.initialize(
			function(obj) {
				BleUtils.debug('Properly connected to BLE chip');
				// BleUtils.debug("Message " + JSON.stringify(obj));
				if (obj.status == 'enabled') {
					callback(true);
				}
			},
			function(obj) {
				BleUtils.debug('Connection to BLE chip failed');
				BleUtils.debug('Message' + obj.status);
				navigator.notification.alert(
						'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
						null,
						'BLE off?',
						'Sorry!');
				callback(false);
			},
			{"request": true}
		);
	};

	self.isConnected = function(address) {
		if (!address) return false;
		var paramsObj = {"address": address};
		var connected;
		bluetoothle.isConnected(connected, paramsObj);
		return connected;
	};

	self.reconnectDevice = function(address, timeout, callback) {
		BleUtils.debug("Beginning to reconnect to " + address + " with " + timeout + " second timeout");
		var paramsObj = {"address": address};
		bluetoothle.reconnect(function(obj) { // reconnectSuccess
				if (obj.status == "connected") {
					BleUtils.debug("Reconnected to: " + obj.name + " - " + obj.address);

					self.clearReconnectTimeout();

					if (callback) {
						callback(true);
					}

				}
				else if (obj.status == "connecting") {
					BleUtils.debug("Reconnecting to: " + obj.name + " - " + obj.address);
				}
				else {
					BleUtils.debug("Unexpected reconnect status: " + obj.status);
					self.clearReconnectTimeout();
					self.closeDevice(obj.address);
					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // reconnectError
				BleUtils.debug("Reconnect error: " + obj.error + " - " + obj.message);
				self.clearReconnectTimeout();
				if (callback) {
					callback(false);
				}
			},
			paramsObj);

		self.reconnectTimer = setTimeout(function() { // connectTimeout
				BleUtils.debug('Connection timed out, stop connection attempts');
				if (callback) {
					callback(false);
				}
			},
			timeout * 1000);
	};

	self.clearReconnectTimeout = function() {
		BleUtils.debug("Clearing reconnect timeout");
		if (self.reconnectTimer != null) {
			clearTimeout(self.reconnectTimer);
		}
	};

	self.connectDevice = function(address, timeout, callback) {
		BleUtils.debug("Beginning to connect to " + address + " with " + timeout + " second timeout");
		var paramsObj = {"address": address};
		bluetoothle.connect(function(obj) { // connectSuccess
				if (obj.status == "connected") {
					BleUtils.debug("Connected to: " + obj.name + " [" + obj.address + "]");

					self.clearConnectTimeout();

					if (callback) {
						callback(true);
					}

				}
				else if (obj.status == "connecting") {
					BleUtils.debug("Connecting to: " + obj.name + " [" + obj.address + "]");
				}
				else {
					BleUtils.debug("Unexpected connect status: " + obj.status);
					self.clearConnectTimeout();
					self.closeDevice(obj.address);
					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // connectError
				BleUtils.debug("Connect error: " + obj.error + " - " + obj.message);
				// for now we are gonna attempt a reconnect
				if (obj.error == 'connect') {
					// BleUtils.debug("Attempt a disconnect, a reconnect didn't work");
				//	self.reconnectDevice(address, timeout, callback);
					// self.disconnectDevice(address);
					BleUtils.debug("close device, try again...");
					self.disconnectDevice(address, function() {
	                    self.closeDevice(address);
	                }, function() {
	                    self.closeDevice(address);
	                });
					if (callback) {
						callback(false);
					}
				} else {
					self.clearConnectTimeout();
					if (callback) {
						callback(false);
					}
				}
			},
			paramsObj);

		self.connectTimer = setTimeout(function() { // connectTimeout
				BleUtils.debug('Connection timed out, stop connection attempts');
				if (callback) {
					callback(false);
				}
			},
			timeout * 1000);
	};

	self.clearConnectTimeout = function() {
		BleUtils.debug("Clearing connect timeout");
		if (self.connectTimer !== null) {
			clearTimeout(self.connectTimer);
		}
	};

	/** Discovery of services and characteristics on the target device (crownstone).
	 *
	 * Discovery must be run before any of the getters/setters can be used. Or else "Service not found" errors
	 * will be generated.
	 */
	self.discoverServices = function(address, callback, successCB, errorCB) {
		BleUtils.debug("Beginning discovery of services for device " + address);
		var paramsObj = {address: address};
		bluetoothle.discover(function(obj) { // discover success
				if (obj.status == "discovered") {
					BleUtils.debug("Discovery completed");
					if (callback) {
						var services = obj.services;
						for (var i = 0; i < services.length; ++i) {
							var serviceUuid = services[i].serviceUuid;
							var characteristics = services[i].characteristics;
							for (var j = 0; j < characteristics.length; ++j) {
								var characteristicUuid = characteristics[j].characteristicUuid;
								BleUtils.debug("Found service " + serviceUuid + " with characteristic " + characteristicUuid);

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
	};

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
	};

	self.startEndlessScan = function(callback) {
		BleUtils.debug('Start endless scan');
		var paramsObj = {};
		bluetoothle.startScan(function(obj) {  // start scan success
				if (obj.status == 'scanResult') {
					// BleUtils.debug('Found device, parse and call callback if company id == ' + dobotsCompanyId);
					var arr = bluetoothle.encodedStringToBytes(obj.advertisement);
					self.parseAdvertisement(arr, 0xFF, function(data) {
						var companyId = BleUtils.byteArrayToUint16(data, 0);
						if (companyId == BleTypes.APPLE_COMPANY_ID) {
							self.parseIBeaconData(obj, data);
						}
						if (companyId == dobotsCompanyId) {
							self.parseDoBotsData(obj, data);
						}
					});
					callback(obj);
				} else if (obj.status == 'scanStarted') {
					BleUtils.debug('Endless scan was started successfully');
				} else {
					BleUtils.debug('Unexpected start scan status: ' + obj.status);
					BleUtils.debug('Stopping scan');
					self.stopEndlessScan();
				}
			},
			function(obj) { // start scan error
				BleUtils.debug('Scan error, status: ' + obj.status);
				// navigator.notification.alert(
				// 		'Scan Error',
				// 		null,
				// 		'Status',
				// 		'Sorry!');
			},
			paramsObj);
	};

	self.stopEndlessScan = function() {
		//BleUtils.debug("stop endless scan...");
		bluetoothle.stopScan(function(obj) { // stop scan success
				if (obj.status == 'scanStopped') {
					//BleUtils.debug('Scan was stopped successfully');
				} else {
					BleUtils.debug('Unexpected stop scan status: ' + obj.status);
				}
			},
			function(obj) { // stop scan error
				BleUtils.debug('Stop scan error: ' + obj.error + ' - ' + obj.message);
			});
	};

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
			} else if (el_type === 0) {
				// BleUtils.debug(search.toString(16) + " not found!");
				return;
			} else {
				i += el_len + 1;
			}
		}
	};

	self.parseIBeaconData = function(obj, data) {
		var companyId = data[0] | data[1] << 8; // little endian
		var advertisementId = data[2] << 8 | data[3]; // big endian
		if (companyId == BleTypes.APPLE_COMPANY_ID && advertisementId == BleTypes.IBEACON_ADVERTISEMENT_ID) {
			obj.isIBeacon = true;
			obj.proximityUuid = BleUtils.bytesToUuid(data.subarray(4, 20));
			obj.major = data[20] << 8 | data[21]; // big endian
			obj.minor = data[22] << 8 | data[23]; // big endian
			// make signed
			obj.calibratedRssi = BleUtils.unsignedToSignedByte(data[24]);
		} else {
			obj.isIBeacon = false;
		}
	};

	self.parseDoBotsData = function(obj, data) {
		var companyId = data[0] | data[1] << 8; // little endian
		if (companyId == BleTypes.DOBOTS_COMPANY_ID) {
			if (data.length >= 3) {
				// new advertisement package
				var deviceType = data[2];
				if (deviceType == BleTypes.DEVICE_CROWNSTONE) {
					obj.isCrownstone = true;
				} else if (deviceType == BleTypes.DEVICE_DOBEACON) {
					obj.isDoBeacon = true;
				} else if (deviceType == BleTypes.DEVICE_FRIDGE) {
					obj.isFridge = true;
				}
			} else {
				// old advertisement package
				obj.isCrownstone = true;
			}
		}
	};

	/*
	 * Contains bug: when a device is in "disconnecting" state, it will never be closed.
	 */
	self.disconnectDevice = function(address, successCB, errorCB) {
		var paramsObj = {"address": address};
		bluetoothle.disconnect(function(obj) { // disconnect success
				if (obj.status == "disconnected")
				{
					BleUtils.debug("Device " + obj.address + " disconnected");
					self.closeDevice(obj.address, successCB, errorCB);
				}
				else if (obj.status == "disconnecting")
				{
					BleUtils.debug("Disconnecting device " + obj.address);
					//if (errorCB) errorCB();
				}
				else
				{
					BleUtils.debug("Unexpected disconnect status from device " + obj.address + ": " + obj.status);
					if (errorCB) errorCB(obj);
				}
			},
			function(obj) { // disconnect error
				BleUtils.debug("Disconnect error from device " + obj.address + ": " + obj.error + " - " + obj.message);
				if (errorCB) errorCB(obj);
			},
			paramsObj);
	};

	self.closeDevice = function(address, successCB, errorCB)
	{
		var paramsObj = {"address": address};
		bluetoothle.close(function(obj)	{ // close success
				if (obj.status == "closed")
				{
					BleUtils.debug("Device " + obj.address + " closed");
					if (successCB) successCB(obj);
				}
				else
				{
					BleUtils.debug("Unexpected close status from device " + obj.address + ": " + obj.status);
					if (errorCB) errorCB(obj);
				}
			},
			function(obj) { // close error
				BleUtils.debug("Close error from device " + obj.address + ": " + obj.error + " - " + obj.message);
				if (errorCB) errorCB(obj);
			},
			paramsObj);
	};

	self.readTemperature = function(address, callback) {
		BleUtils.debug("Read temperature at service " + BleTypes.GENERAL_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_TEMPERATURE_UUID);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.GENERAL_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_TEMPERATURE_UUID};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var temperature = bluetoothle.encodedStringToBytes(obj.value);
					BleUtils.debug("temperature: " + temperature[0]);

					callback(temperature[0]);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading temperature: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.scanDevices = function(address, scan) {
		var u8 = new Uint8Array(1);
		u8[0] = scan ? 1 : 0;
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_DEVICE_SCAN_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_DEVICE_SCAN_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					BleUtils.debug('Successfully written to device scan characteristic - ' + obj.status);
				} else {
					BleUtils.debug('Writing to device scan characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				BleUtils.debug("Error in writing device scan characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.listDevices = function(address, callback) {
		BleUtils.debug("Read device list at service " + BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_DEVICE_LIST_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_DEVICE_LIST_UUID };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var list = bluetoothle.encodedStringToBytes(obj.value);
					BleUtils.debug("list: " + list[0]);

					callback(list);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading device list: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.writePWM = function(address, value, successCB, errorCB) {
		var u8 = new Uint8Array(1);
		u8[0] = value;
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_PWM_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_PWM_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					BleUtils.debug('Successfully written to pwm characteristic - ' + obj.status);

					if (successCB) successCB();
				} else {
					BleUtils.debug('Writing to pwm characteristic was not successful' + obj);

					if (errorCB) errorCB();
				}
			},
			function(obj) { // wrtie error
				BleUtils.debug("Error in writing to pwm characteristic: " + obj.error + " - " + obj.message);

				if (errorCB) errorCB();
			},
			paramsObj);
	};

	// TODO: should have errorCB
	self.readPWM = function(address, callback) {
		BleUtils.debug("Read current consumption at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_PWM_UUID);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_PWM_UUID};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var pwm = bluetoothle.encodedStringToBytes(obj.value);
					BleUtils.debug("pwm: " + pwm[0]);

					callback(pwm[0]);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading current consumption: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	// TODO: should have errorCB
	self.readPowerConsumption = function(address, callback) {
		BleUtils.debug("Read power consumption at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_POWER_CONSUMPTION_UUID);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_POWER_CONSUMPTION_UUID};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var arr = bluetoothle.encodedStringToBytes(obj.value);
					var powerConsumption = BleUtils.byteArrayToUint16(arr, 0);
					BleUtils.debug("PowerConsumption: " + powerConsumption);

					// todo: check if power consumption is only 1 byte
					callback(powerConsumption);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading power consumption: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	// TODO: should have errorCB
	self.sampleCurrent = function(address, value, callback) {
		var u8 = new Uint8Array(1);
		u8[0] = value;
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_SAMPLE_CURRENT_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_SAMPLE_CURRENT_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					BleUtils.debug('Successfully written to sample current characteristic - ' + obj.status);

					if (callback) {
						callback(true);
					}
				} else {
					BleUtils.debug('Writing to sample current characteristic was not successful' + obj);

					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // write error
				BleUtils.debug("Error in writing to sample current characteristic: " + obj.error + " - " + obj.message);

				if (callback) {
					callback(false);
				}
			},
			paramsObj);
	};

	// TODO: should have errorCB
	self.getCurrentCurve = function(address, callback) {
		BleUtils.debug("Read current curve at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_CURRENT_CURVE_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_CURRENT_CURVE_UUID };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var arr8 = bluetoothle.encodedStringToBytes(obj.value);
					BleUtils.debug(JSON.stringify(arr8));
					if (arr8.length < 2) {
						BleUtils.debug("Invalid current curve data (too short): ");
						BleUtils.debug(JSON.stringify(arr8));
						return;
					}
					callback(arr8);


					//if (arr8.length < 2) {
						//BleUtils.debug("Invalid current curve data (too short): ");
						//BleUtils.debug(JSON.stringify(arr8));
						//return;
					//}
					//var size = (arr8[0] << 8) + arr8[1];
					//if (size != arr8.length/2-1) {
						//BleUtils.debug("Invalid current curve data (size mismatch): ");
						//BleUtils.debug(JSON.stringify(arr8));
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
					//BleUtils.debug("Result:" + arrStr);

					//callback(arr16);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading current curve: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	/* set floor to value
	 */
	self.setFloor = function(address, value, successCB, errorCB) {
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_FLOOR;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/** Get a floor from the connected device
	 */
	self.getFloor = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_FLOOR,
			function(configuration) {
				if (configuration.length != 1) {
					var msg = "Configuration value for floor level should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var floor = configuration.payload[0];
					BleUtils.debug("Floor is set to: " + floor);
					if (successCB) successCB(floor);
				}
			},
			errorCB);
	};

	// TODO: should be writeWifi()
	/* Set Wifi SSID and password
	 */
	self.setWifi = function(address, value, successCB, errorCB) {
		var u8;
		if (value !== "") {
			u8 = bluetoothle.stringToBytes(value);
		} else {
			var msg = "Value shouldn't be empty";
			if (errorCB) errorCB(msg);
		}

		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_WIFI;
		configuration.length = value.length; // TODO: should be u8.length?
		configuration.payload = u8;
		BleUtils.debug("Send payload: " + u8);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};


	/*
	 * Set the transmission power
	 * Can be: -30, -20, -16, -12, -8, -4, 0, or 4
	 */
	self.setTxPower = function(address, value, successCB, errorCB) {
		BleUtils.debug("set TX power to " + value);
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_TX_POWER;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the transmission power
	 */
	self.getTxPower = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_TX_POWER,
			function(configuration) {
				if (configuration.length != 1) {
					var msg = "Configuration value for tx power should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var txPower = BleUtils.unsignedToSignedByte(configuration.payload[0]);
					BleUtils.debug("TX power is set to: " + txPower);
					if (successCB) successCB(txPower);
				}
			},
			errorCB
		);
	};


	/*
	 * Set the advertisement interval (in ms)
	 */
	self.setAdvertisementInterval = function(address, value, successCB, errorCB) {
		BleUtils.debug("set advertisement interval to " + value);
		value = Math.floor(value/0.625);
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_ADV_INTERVAL;
		configuration.length = 2;
		configuration.payload = BleUtils.uint16ToByteArray(value);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the advertisement interval (in ms)
	 */
	self.getAdvertisementInterval = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_ADV_INTERVAL,
			function(configuration) {
				if (configuration.length != 2) {
					var msg = "Configuration value for advertisement interval should have length 2";
					if (errorCB) errorCB(msg);
				} else {
					var interval = BleUtils.byteArrayToUint16(configuration.payload, 0) * 0.625;
					BleUtils.debug("Advertisement interval is set to: " + interval);
					if (successCB) successCB(interval);
				}
			},
			errorCB
		);
	};


	/*
	 * Set the minimal environment temperature
	 */
	self.setMinEnvTemp = function(address, value, successCB, errorCB) {
		console.log("set min env temp to " + value);
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.CONFIG_TYPE_MIN_ENV_TEMP;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	/*
	 * Get the minimal environment temperature
	 */
	self.getMinEnvTemp = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_MIN_ENV_TEMP,
			function(configuration) {
				if (configuration.length != 1) {
					var msg = "Configuration value for min env temp should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var temp = BleUtils.unsignedToSignedByte(configuration.payload[0]);
					console.log("Min env temp is set to: " + temp);
					if (successCB) successCB(temp);
				}
			},
			errorCB
		);
	}

	/*
	 * Set the maximal environment temperature
	 */
	self.setMaxEnvTemp = function(address, value, successCB, errorCB) {
		console.log("set max env temp to " + value);
		var configuration = new BleConfigurationMessage;
		configuration.type = BleTypes.CONFIG_TYPE_MAX_ENV_TEMP;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	}

	/*
	 * Get the maximal environment temperature
	 */
	self.getMaxEnvTemp = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_MAX_ENV_TEMP,
			function(configuration) {
				if (configuration.length != 1) {
					var msg = "Configuration value for max env temp should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var temp = BleUtils.unsignedToSignedByte(configuration.payload[0]);
					console.log("Max env temp is set to: " + temp);
					if (successCB) successCB(temp);
				}
			},
			errorCB
		);
	}


	/*
	 * Set the major value for beacon
	 */
	self.setBeaconMajor = function(address, value, successCB, errorCB) {
		BleUtils.debug("set major to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_IBEACON_MAJOR;
		configuration.length = 2;
		configuration.payload = BleUtils.uint16ToByteArray(value);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the major value of the beacon
	 */
	self.getBeaconMajor = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_IBEACON_MAJOR,
			function(configuration) {
				if (configuration.length > 2) {
					var msg = "Configuration value for major should have length 2";
					if (errorCB) errorCB(msg);
				} else {
					var major = BleUtils.byteArrayToUint16(configuration.payload, 0);
					BleUtils.debug("Major is set to: " + major);
					if (successCB) successCB(major);
				}
			},
			errorCB
		);
	};

	/*
	 * Set the minor value of the beacon
	 */
	self.setBeaconMinor = function(address, value, successCB, errorCB) {
		BleUtils.debug("set minor to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_IBEACON_MINOR;
		configuration.length = 2;
		configuration.payload = BleUtils.uint16ToByteArray(value);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the minor value of the beacon
	 */
	self.getBeaconMinor = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_IBEACON_MINOR,
			function(configuration) {
				if (configuration.length > 2) {
					var msg = "Configuration value for minor should have length 2";
					if (errorCB) errorCB(msg);
				} else {
					var minor = BleUtils.byteArrayToUint16(configuration.payload, 0);
					BleUtils.debug("Minor is set to: " + minor);
					if (successCB) successCB(minor);
				}
			},
			errorCB
		);
	};

	/*
	 * Get the calibrated rssi at 1m of the beacon
	 */
	self.setBeaconCalibratedRssi = function(address, value, successCB, errorCB) {
		BleUtils.debug("set rssi to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_IBEACON_RSSI;
		configuration.length = 1;
		configuration.payload = new Uint8Array([value]);
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Set the calibrated rssi at 1 m of the beacon
	 */
	self.getBeaconCalibratedRssi = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_IBEACON_RSSI,
			function(configuration) {
				if (configuration.length > 1) {
					var msg = "Configuration value for rssi should have length 1";
					if (errorCB) errorCB(msg);
				} else {
					var rssi = BleUtils.unsignedToSignedByte(configuration.payload[0]);
					BleUtils.debug("Rssi is set to: " + rssi);
					if (successCB) successCB(rssi);
				}
			},
			errorCB
		);
	};

	/*
	 * Set the proximity UUID of the beacon
	 */
	self.setBeaconProximityUuid = function(address, value, successCB, errorCB) {
		BleUtils.debug("set proximity uuid to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_IBEACON_PROXIMITY_UUID;
		configuration.payload = BleUtils.uuidToBytes(value);
		configuration.length = configuration.payload.length;
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the proximity UUID of the beacon
	 */
	self.getBeaconProximityUuid = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_IBEACON_PROXIMITY_UUID,
			function(configuration) {
				if (configuration.length > 16) {
					var msg = "Configuration value for proximity uuid should have length 16";
					if (errorCB) errorCB(msg);
				} else {
					var uuid = BleUtils.bytesToUuid(configuration.payload);
					BleUtils.debug("Uuid is set to: " + uuid);
					if (successCB) successCB(uuid);
				}
			},
			errorCB
		);
	};

	/*
	 * Set the device name
	 */
	self.setDeviceName = function(address, value, successCB, errorCB) {
		BleUtils.debug("set name to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_NAME;
		configuration.payload = bluetoothle.stringToBytes(value);
		configuration.length = configuration.payload.length;
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the device name
	 */
	self.getDeviceName = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_NAME,
			function(configuration) {
				if (configuration.length === 0) {
					if (errorCB) errorCB("received empty name");
				} else {
					var name = bluetoothle.bytesToString(configuration.payload);
					BleUtils.debug("Name is set to: " + name);
					if (successCB) successCB(name);
				}
			},
			errorCB
		);
	};

	/*
	 * Set the device type
	 */
	self.setDeviceType = function(address, value, successCB, errorCB) {
		BleUtils.debug("set device type to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_DEVICE_TYPE;
		configuration.payload = bluetoothle.stringToBytes(value);
		configuration.length = configuration.payload.length;
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the device type
	 */
	self.getDeviceType = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_DEVICE_TYPE,
			function(configuration) {
				if (configuration.length === 0) {
					if (errorCB) errorCB("received empty device type");
				} else {
					var deviceType = bluetoothle.bytesToString(configuration.payload);
					BleUtils.debug("Device type is set to: " + deviceType);
					if (successCB) successCB(deviceType);
				}
			},
			errorCB
		);
	};

	/*
	 * Set the room
	 */
	self.setRoom = function(address, value, successCB, errorCB) {
		BleUtils.debug("set room to " + value);
		//var configuration = {};
		var configuration = new BleConfigurationMessage();
		configuration.type = BleTypes.CONFIG_TYPE_ROOM;
		configuration.payload = bluetoothle.stringToBytes(value);
		configuration.length = configuration.payload.length;
		self.writeConfiguration(address, configuration, successCB, errorCB);
	};

	/*
	 * Get the room
	 */
	self.getRoom = function(address, successCB, errorCB) {
		self.getConfiguration(
			address,
			BleTypes.CONFIG_TYPE_ROOM,
			function(configuration) {
				if (configuration.length === 0) {
					if (errorCB) errorCB("received empty room");
				} else {
					var room = bluetoothle.bytesToString(configuration.payload);
					BleUtils.debug("Room is set to: " + room);
					if (successCB) successCB(room);
				}
			},
			errorCB
		);
	};

	/** Select and read configuration
	 */
	self.getConfiguration = function(address, configurationType, successCB, errorCB) {
		self.selectConfiguration(
			address,
			configurationType,
			function() {
				// we need to give the crownstone some time to write the value to the
				// getConfigurationCharacteristic
				setTimeout(function() {
					self.readConfiguration(address, successCB, errorCB);
				}, 50);
			},
			errorCB
		);
	};

	/** Get a specific configuration, selected before in selectConfiguration
	 */
	self.readConfiguration = function(address, successCB, errorCB) {
		BleUtils.debug("Read configuration at service " + BleTypes.GENERAL_SERVICE_UUID +
				' and characteristic ' + BleTypes.CHAR_GET_CONFIGURATION_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.GENERAL_SERVICE_UUID,
			"characteristicUuid": BleTypes.CHAR_GET_CONFIGURATION_UUID};
		bluetoothle.read(
			function(obj) { // read success
				if (obj.status == "read") {
					var bytearray = bluetoothle.encodedStringToBytes(obj.value);
					//var configuration = {};
					var configuration = new BleConfigurationMessage();
					configuration.type = bytearray[0];
					configuration.length = BleUtils.byteArrayToUint16(bytearray, 2);
					configuration.payload = new Uint8Array(configuration.length);
					for (var i = 0; i < configuration.length; i++) {
						configuration.payload[i] = bytearray[i+4];
					}
					BleUtils.debug("Read configuration: " + JSON.stringify(configuration));
					if (successCB) successCB(configuration);
				}
				else {
					var msg = "Unexpected read status: " + obj.status;
					BleUtils.debug(msg);
					if (errorCB) errorCB();
				}
			},
			function(obj) { // read error
				var msg = 'Error in reading "get configuration" characteristic' +
					obj.error + " - " + obj.message;
				BleUtils.debug(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	};

	/** Writing a configuration
	 *
	 */
	self.writeConfiguration = function(address, configuration, successCB, errorCB) {

		BleUtils.debug("Write to " + address + " configuration type " + configuration.type);

		// build up a single byte array, prepending payload with type and payload length, preamble size is 4
		var u8 = new Uint8Array(configuration.length+4);
		u8[0] = configuration.type;
		u8[1] = BleTypes.RESERVED;
		u8[2] = (configuration.length & 0xFF); // endianness: least significant byte first
		u8[3] = ((configuration.length >> 8) & 0xFF);
		u8.set(configuration.payload, 4);

		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.GENERAL_SERVICE_UUID +
				' and characteristic ' + BleTypes.CHAR_SET_CONFIGURATION_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.GENERAL_SERVICE_UUID,
			"characteristicUuid": BleTypes.CHAR_SET_CONFIGURATION_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "write configuration" characteristic - ' +
						obj.status;
					BleUtils.debug(msg);
					if (successCB) {
						setTimeout(function() {
							successCB(msg);
						}, 500);
					}
				} else {
					var msg = 'Error in writing to "write configuration" characteristic - ' +
						obj;
					BleUtils.debug(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "write configuration" characteristic - ' +
					obj.error + " - " + obj.message;
				BleUtils.debug(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	};

	/** Before getting the value of a specific configuration type, we have to select it.
	 */
	self.selectConfiguration = function(address, configurationType, successCB, errorCB) {
		var u8 = new Uint8Array(1);
		u8[0] = configurationType;

		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.GENERAL_SERVICE_UUID +
				' and characteristic ' + BleTypes.CHAR_SELECT_CONFIGURATION_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.GENERAL_SERVICE_UUID,
			"characteristicUuid": BleTypes.CHAR_SELECT_CONFIGURATION_UUID , "value" : v};
		bluetoothle.write(
			function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "select configuration" characteristic - ' +
						obj.status;
					BleUtils.debug(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to "select configuration" characteristic - ' +
						obj;
					BleUtils.debug(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "select configuration" characteristic - ' +
					obj.error + " - " + obj.message;
				BleUtils.debug(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	};

// TODO: length has to be the sizeof(payload) + sizeof(target) + sizeof(type), not only sizeof(payload) !!
	/** Send a message over the mesh network
	 * message needs the following properties:
	 * .channel: there are several channels to use
	 * .target: bluetooth address (6 bytes) of target of this message. Use all zeroes for broadcast.
	 * .type: what type of message this is
	 * .length: length of payload
	 * .payload: data to be sent
	 */
	self.writeMeshMessage = function(address, message, successCB, errorCB) {

		message.length += 8; // Add length of target address and length of message type
		// build up a single byte array, prepending payload with type and payload length, preamble size is 4
		var u8 = new Uint8Array(message.length+12);
		u8[0] = message.channel;
		u8[1] = BleTypes.RESERVED;
		u8[2] = (message.length & 0xFF); // endianness: least significant byte first
		u8[3] = (message.length >> 8 & 0xFF);

		if (message.target.length != 6) {
			BleUtils.debug("invalid bluetooth address: " + message.target);
			return;
		}
		u8.set(message.target, 4); // bluetooth address of target crownstone: 6 bytes
		u8[10] = (message.type & 0xFF); // endianness: least significant byte first
		u8[11] = (message.type >> 8 & 0xFF);
		u8.set(message.payload, 12);

		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.GENERAL_SERVICE_UUID +
				' and characteristic ' + BleTypes.CHAR_MESH_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.GENERAL_SERVICE_UUID,
			"characteristicUuid": BleTypes.CHAR_MESH_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "mesh" characteristic - ' + obj.status;
					BleUtils.debug(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to "mesh" characteristic - ' + obj;
					BleUtils.debug(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "mesh" characteristic - ' +
					obj.error + " - " + obj.message;
				BleUtils.debug(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	};

	self.writeCurrentLimit = function(address, value) {
		var u8 = new Uint8Array(1);
		u8[0] = value & 0xFF;
		// u8[1] = (value >> 8) & 0xFF;
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_CURRENT_LIMIT_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_CURRENT_LIMIT_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					BleUtils.debug('Successfully written to current limit characteristic - ' + obj.status);
				} else {
					BleUtils.debug('Writing to current limit characteristic was not successful' + obj);
				}
			},
			function(obj) { // write errror
				BleUtils.debug("Error in writing to current limit characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.readCurrentLimit = function(address, callback) {
		BleUtils.debug("Read current limit at service " + BleTypes.POWER_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_CURRENT_LIMIT_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.POWER_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_CURRENT_LIMIT_UUID };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var currentLimit = bluetoothle.encodedStringToBytes(obj.value);
					BleUtils.debug("current limit: " + currentLimit[0]);

					var value = currentLimit[0];

					callback(value);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading current limit characteristic: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.getTrackedDevices = function(address, callback) {
		BleUtils.debug("Read device list at service " + BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_LIST_TRACKED_DEVICES_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_LIST_TRACKED_DEVICES_UUID };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var list = bluetoothle.encodedStringToBytes(obj.value);
					BleUtils.debug("list: " + list[0]);

					callback(list);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading tracked devices: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.addTrackedDevice = function(address, bt_address, rssi) {
		var u8 = new Uint8Array(7);
		for (var i = 0; i < 6; i++) {
			u8[i] = parseInt(bt_address[i], 16);
			BleUtils.debug("i: " + u8[i]);
		}
		u8[6] = rssi;
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_ADD_TRACKED_DEVICE_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.INDOOR_LOCALIZATION_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_ADD_TRACKED_DEVICE_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					BleUtils.debug('Successfully written to add tracked device characteristic - ' + obj.status);
				} else {
					BleUtils.debug('Writing to add tracked device characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				BleUtils.debug("Error in writing to add tracked device characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.writeCurrentTime = function(address, value, successCB, errorCB) {
		var u8 = BleUtils.uint32ToByteArray(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.SCHEDULE_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_CURRENT_TIME_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.SCHEDULE_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_CURRENT_TIME_UUID , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					BleUtils.debug('Successfully written to current time characteristic - ' + obj.status);
					if (successCB) successCB();
				} else {
					BleUtils.debug('Writing to current time characteristic was not successful' + obj);
					if (errorCB) errorCB();
				}
			},
			function(obj) { // write error
				BleUtils.debug("Error in writing to current time characteristic: " + obj.error + " - " + obj.message);
				if (errorCB) errorCB();
			},
			paramsObj);
	};

	self.readCurrentTime = function(address, successCB, errorCB) {
		BleUtils.debug("Read current consumption at service " + BleTypes.SCHEDULE_SERVICE_UUID + ' and characteristic ' + BleTypes.CHAR_CURRENT_TIME_UUID);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.SCHEDULE_SERVICE_UUID, "characteristicUuid": BleTypes.CHAR_CURRENT_TIME_UUID};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var u8 = bluetoothle.encodedStringToBytes(obj.value);
					var time = BleUtils.byteArrayToUint32(u8, 0);
					BleUtils.debug("current time: " + time);
					if (successCB) successCB(time);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					if (errorCB) errorCB();
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading current consumption: ' + obj.error + " - " + obj.message);
				if (errorCB) errorCB();
			},
			paramsObj);
	};

	self.writeReset = function(address, value, successCB, errorCB) {
		var u8 = BleUtils.uint32ToByteArray(value);
		var v = bluetoothle.bytesToEncodedString(u8);
		BleUtils.debug("Write " + v + " at service " + BleTypes.GENERAL_SERVICE_UUID +
				' and characteristic ' + BleTypes.CHAR_RESET_UUID );
		var paramsObj = {"address": address, "serviceUuid": BleTypes.GENERAL_SERVICE_UUID,
			"characteristicUuid": BleTypes.CHAR_RESET_UUID , "value" : v};
		bluetoothle.write(
			function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to reset characteristic - ' +
						obj.status;
					BleUtils.debug(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to reset characteristic - ' +
						obj;
					BleUtils.debug(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to reset characteristic - ' +
					obj.error + " - " + obj.message;
				BleUtils.debug(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	};

	self.dfuReset = function(address, value, successCB, errorCB) {

		// need to enable notifications first, otherwise bootloader will complain
		var subscribeParams = {"address": address, "serviceUuid": BleTypes.DFU_SERVICE_UUID,
			"characteristicUuid": BleTypes.CHAR_CONTROL_POINT_UUID, "isNotification": true};
		bluetoothle.subscribe(
			function(subscribe_obj) {
				if (subscribe_obj.status == 'subscribed') {
					var u8 = new Uint8Array(1);
					u8[0] = value;

					var v = bluetoothle.bytesToEncodedString(u8);
					BleUtils.debug("Write " + v + " at service " + BleTypes.DFU_SERVICE_UUID +
							' and characteristic ' + BleTypes.CHAR_CONTROL_POINT_UUID );
					var paramsObj = {"address": address, "serviceUuid": BleTypes.DFU_SERVICE_UUID,
						"characteristicUuid": BleTypes.CHAR_CONTROL_POINT_UUID , "value" : v};
					bluetoothle.write(
						function(obj) { // write success
							if (obj.status == 'written') {
								var msg = 'Successfully written to DFU reset characteristic - ' +
									obj.status;
								BleUtils.debug(msg);
								if (successCB) successCB(msg);
							} else {
								var msg = 'Error in writing to DFU reset characteristic - ' +
									obj;
								BleUtils.debug(msg);
								if (errorCB) errorCB(msg);
							}
						},
						function(obj) {
							// the DFU target will (in most cases) reset so fast that the
							// write actually fails. so just assume it succeeded for now
							var msg = 'Reset successful';
							BleUtils.debug(msg);
							if (successCB) successCB(msg)
						},
						paramsObj
					);
				}
			},
			function(subscribe_obj) { // write error
				var msg = 'Error in subscribing to reset characteristic - ' +
					subscribe_obj.error + " - " + subscribe_obj.message;
				BleUtils.debug(msg);
				if (errorCB) errorCB(msg);
			},
			subscribeParams
		);
	};

	self.readHardwareRevision = function(address, callback) {
		BleUtils.debug("Read hardware revision at service " + BleTypes.DEVICE_INFORMATION_UUID + ' and characteristic ' + BleTypes.CHAR_HARDWARE_REVISION_UUID);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.DEVICE_INFORMATION_UUID, "characteristicUuid": BleTypes.CHAR_HARDWARE_REVISION_UUID};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var bytes = bluetoothle.encodedStringToBytes(obj.value);
					var hardwareRevision = bluetoothle.bytesToString(bytes);

					BleUtils.debug("hardware revision: " + hardwareRevision);

					callback(hardwareRevision);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading hardware revision: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

	self.readFirmwareRevision = function(address, callback) {
		BleUtils.debug("Read firmware revision at service " + BleTypes.DEVICE_INFORMATION_UUID + ' and characteristic ' + BleTypes.CHAR_FIRMWARE_REVISION_UUID);
		var paramsObj = {"address": address, "serviceUuid": BleTypes.DEVICE_INFORMATION_UUID, "characteristicUuid": BleTypes.CHAR_FIRMWARE_REVISION_UUID};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var bytes = bluetoothle.encodedStringToBytes(obj.value);
					var firmwareRevision = bluetoothle.bytesToString(bytes);

					BleUtils.debug("firmware revision: " + firmwareRevision);

					callback(firmwareRevision);
				}
				else
				{
					BleUtils.debug("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				BleUtils.debug('Error in reading firmware revision: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	};

}

