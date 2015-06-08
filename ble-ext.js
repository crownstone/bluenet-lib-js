// TODO: discover services
// TODO: sort ascending / descending
var BleState;
(function (BleState) {
    BleState[BleState["uninitialized"] = 0] = "uninitialized";
    BleState[BleState["initialized"] = 1] = "initialized";
    BleState[BleState["scanning"] = 2] = "scanning";
    BleState[BleState["connecting"] = 3] = "connecting";
    BleState[BleState["connected"] = 4] = "connected";
})(BleState || (BleState = {}));
var BleDevice = (function () {
    function BleDevice(obj) {
        this.address = "";
        this.name = "";
        this.rssi = -128;
        if (obj.hasOwnProperty("address") && obj.hasOwnProperty("name") && obj.hasOwnProperty("rssi")) {
            this.address = obj.address;
            this.name = obj.name;
            this.rssi = obj.rssi;
        }
    }
    return BleDevice;
})();
var BleDeviceList = (function () {
    function BleDeviceList() {
        this.devices = [];
    }
    BleDeviceList.prototype.getDevice = function (address) {
        var index;
        if (this.devices.some(function (el, ind) {
            if (el.address == address) {
                index = ind;
                return true;
            }
        })) {
            return this.devices[index];
        }
        return undefined;
    };
    //addDevice(obj: BleDevice) {
    //	if (!this.getDevice(obj.address)) {
    //		this.devices.push(obj);
    //	}
    //}
    BleDeviceList.prototype.updateDevice = function (device) {
        var dev = this.getDevice(device.address);
        if (dev) {
            dev = device;
        }
        else {
            //this.addDevice(obj);
            this.devices.push(device);
        }
    };
    // Sort by RSSI, descending.
    BleDeviceList.prototype.sort = function () {
        this.devices.sort(function (a, b) {
            return b.rssi - a.rssi;
        });
    };
    return BleDeviceList;
})();
var BleExt = (function () {
    function BleExt() {
        this.ble = new BleBase();
        this.devices = new BleDeviceList();
        this.characteristics = {};
        this.state = BleState.uninitialized;
    }
    // TODO: just inherit from base class
    BleExt.prototype.init = function (successCB, errorCB) {
        this.ble.init(function (enabled) {
            if (enabled) {
                this.state = BleState.initialized;
                if (successCB)
                    successCB();
            }
            else {
                if (errorCB)
                    errorCB();
            }
        });
    };
    BleExt.prototype.startScan = function (scanCB) {
        this.state = BleState.scanning;
        this.ble.startEndlessScan(function (obj) {
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
            if (scanCB)
                scanCB(obj);
        });
        //		}.bind(this));
    };
    // TODO: just inherit from base class
    BleExt.prototype.stopScan = function (successCB, errorCB) {
        this.state = BleState.initialized;
        this.ble.stopEndlessScan();
        if (successCB)
            successCB();
    };
    BleExt.prototype.connect = function (address, successCB, errorCB) {
        if (address) {
            this.setTarget(address);
        }
        this.state = BleState.connecting;
        this.ble.connectDevice(this.targetAddress, 5, function (success) {
            if (success) {
                this.onConnect();
                if (successCB)
                    successCB();
            }
            else {
                if (errorCB)
                    errorCB();
            }
        });
    };
    BleExt.prototype.disconnect = function (successCB, errorCB) {
        this.ble.disconnectDevice(this.targetAddress, function () {
            this.onDisconnect();
            successCB();
        }, function () {
            console.log("Assuming we are disconnected anyway");
            errorCB();
        });
    };
    BleExt.prototype.discoverCharacteristics = function (successCB, errorCB) {
        this.ble.discoverServices(this.targetAddress, function (serviceUuid, characteristicUuid) {
            this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
            if (successCB)
                successCB(serviceUuid, characteristicUuid);
        }, errorCB);
    };
    // Called on successful connect
    BleExt.prototype.onConnect = function () {
        this.state = BleState.connected;
        if (this.disconnectTimeout != null) {
            clearTimeout(this.disconnectTimeout);
        }
        if (this.onConnectCallback)
            this.onConnectCallback();
    };
    BleExt.prototype.onDisconnect = function () {
        this.state = BleState.initialized;
        if (this.disconnectTimeout != null) {
            clearTimeout(this.disconnectTimeout);
        }
        //this.targetAddress = "";
        this.characteristics = {};
    };
    BleExt.prototype.onCharacteristicDiscover = function (serviceUuid, characteristicUuid) {
        this.characteristics[characteristicUuid] = true;
    };
    BleExt.prototype.setConnectListener = function (func) {
        this.onConnectCallback = func;
    };
    BleExt.prototype.setTarget = function (address) {
        this.targetAddress = address;
    };
    BleExt.prototype.getDeviceList = function () { return this.devices; };
    BleExt.prototype.getState = function () { return this.state; };
    BleExt.prototype.connectAndDiscoverAll = function (address, successCB, errorCB) {
        function connectionSuccess() {
            this.ble.discoverServices(address, function (serviceUuid, characteristicUuid) {
                this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
                if (successCB)
                    successCB();
            }, function discoveryFailure(msg) {
                console.log(msg);
                this.disconnect();
                if (errorCB)
                    errorCB(msg);
            });
        }
        if (this.state == BleState.initialized) {
            //			var timeout = 10;
            this.connect(address, 
            //				timeout,
            connectionSuccess, errorCB);
        }
        else if (this.state == BleState.connected && this.targetAddress == address) {
            connectionSuccess();
        }
        else {
            if (errorCB)
                errorCB("Not in correct state to connect and not connected to " + address);
        }
    };
    BleExt.prototype.connectAndDiscoverChar = function (address, serviceUuid, characteristicUuid, successCB, errorCB) {
        function connectionSuccess() {
            if (this.characteristics.hasOwnProperty(characteristicUuid)) {
                if (successCB)
                    successCB();
            }
            else {
                this.ble.discoverCharacteristic(address, serviceUuid, characteristicUuid, function (serviceUuid, characteristicUuid) {
                    this.onCharacteristicDiscover(serviceUuid, characteristicUuid);
                    if (successCB)
                        successCB();
                }, function discoveryFailure(msg) {
                    console.log(msg);
                    this.disconnect();
                    if (errorCB)
                        errorCB(msg);
                });
            }
        }
        if (this.state == BleState.initialized) {
            //			var timeout = 10;
            this.connect(address, 
            //				timeout,
            connectionSuccess, errorCB);
        }
        else if (this.state == BleState.connected && this.targetAddress == address) {
            connectionSuccess();
        }
        else {
            if (errorCB)
                errorCB("Not in correct state to connect and not connected to " + address);
        }
    };
    /* Connects, discovers characteristic, executes given function, then disconnects
     */
    BleExt.prototype.connectExecuteAndDisconnect = function (address, serviceUuid, characteristicUuid, func, successCB, errorCB) {
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
            func(function () {
                callback();
                if (successCB)
                    successCB();
            }, function () {
                callback();
                if (errorCB)
                    errorCB();
            });
        }
        // And here we go..
        this.connectAndDiscoverChar(address, serviceUuid, characteristicUuid, discoverSuccess, errorCB);
    };
    ///////////////////
    // Power service //
    ///////////////////
    BleExt.prototype.powerOn = function (successCB, errorCB) {
        this.writePWM(255, successCB, errorCB);
    };
    BleExt.prototype.powerOff = function (successCB, errorCB) {
        this.writePWM(0, successCB, errorCB);
    };
    BleExt.prototype.writePWM = function (pwm, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(pwmUuid)) {
            errorCB();
            return;
        }
        console.log("Set pwm to " + pwm);
        this.ble.writePWM(this.targetAddress, pwm, successCB, errorCB);
    };
    BleExt.prototype.connectAndWritePWM = function (address, pwm, successCB, errorCB) {
        function func(successCB, errorCB) {
            this.writePWM(pwm, successCB, errorCB);
        }
        this.connectExecuteAndDisconnect(address, powerServiceUuid, pwmUuid, func, successCB, errorCB);
    };
    BleExt.prototype.readPWM = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(pwmUuid)) {
            errorCB();
            return;
        }
        console.log("Reading current PWM value");
        this.ble.readPWM(this.targetAddress, successCB); //TODO: should have an errorCB
    };
    BleExt.prototype.connectAndReadPWM = function (address, successCB, errorCB) {
        function func(successCB, errorCB) {
            this.readPWM(successCB, errorCB);
        }
        this.connectExecuteAndDisconnect(address, powerServiceUuid, pwmUuid, func, successCB, errorCB);
    };
    BleExt.prototype.connectAndTogglePower = function (address, successCB, errorCB) {
        this.connectAndReadPWM(address, function (value) {
            if (value > 0) {
                this.connectAndWritePWM(address, 0, successCB, errorCB);
            }
            else {
                this.connectAndWritePWM(address, 255, successCB, errorCB);
            }
        }, errorCB);
    };
    BleExt.prototype.readCurrentConsumption = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(sampleCurrentUuid) ||
            !this.characteristics.hasOwnProperty(currentConsumptionUuid)) {
            errorCB();
            return;
        }
        this.ble.sampleCurrent(this.targetAddress, 0x01, function () {
            this.ble.readCurrentConsumption(this.targetAddress, successCB); //TODO: should have an errorCB
        }); // TODO: should have an errorCB
    };
    BleExt.prototype.readCurrentCurve = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(sampleCurrentUuid) ||
            !this.characteristics.hasOwnProperty(currentCurveUuid)) {
            errorCB();
            return;
        }
        this.ble.sampleCurrent(this.targetAddress, 0x02, function () {
            this.ble.getCurrentCurve(this.targetAddress, successCB); //TODO: should have an errorCB
        }); // TODO: should have an errorCB
    };
    BleExt.prototype.writeCurrentLimit = function (value, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(currentLimitUuid)) {
            errorCB();
            return;
        }
        console.log("TODO");
        //this.ble.writeCurrentLimit(this.targetAddress, value)
    };
    BleExt.prototype.readCurrentLimit = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(currentLimitUuid)) {
            errorCB();
            return;
        }
        console.log("TODO");
        this.ble.readCurrentLimit(this.targetAddress, successCB); //TODO: should have an errorCB
    };
    /////////////////////
    // General service //
    /////////////////////
    BleExt.prototype.readTemperature = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(temperatureCharacteristicUuid)) {
            errorCB();
            return;
        }
        this.ble.readTemperature(this.targetAddress, successCB); //TODO: should have an errorCB
    };
    BleExt.prototype.writeMeshMessage = function (obj, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(meshCharacteristicUuid)) {
            errorCB();
            return;
        }
        console.log("Send mesh message: ", obj);
        this.ble.writeMeshMessage(this.targetAddress, obj, successCB, errorCB);
    };
    BleExt.prototype.writeConfiguration = function (obj, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
            return;
        }
        console.log("Set config");
        this.ble.writeConfiguration(this.targetAddress, obj, successCB, errorCB);
    };
    BleExt.prototype.connectAndWriteConfiguration = function (address, config, successCB, errorCB) {
        function func(successCB, errorCB) {
            this.writeConfiguration(config, successCB, errorCB);
        }
        this.connectExecuteAndDisconnect(address, generalServiceUuid, setConfigurationCharacteristicUuid, func, successCB, errorCB);
    };
    BleExt.prototype.readConfiguration = function (configurationType, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(selectConfigurationCharacteristicUuid) ||
            !this.characteristics.hasOwnProperty(getConfigurationCharacteristicUuid)) {
            errorCB();
            return;
        }
        this.ble.getConfiguration(this.targetAddress, configurationType, successCB, errorCB);
    };
    // TODO writing/reading configs, should be replaced with a functions to convert value object to a config object and then call writeConfiguration
    BleExt.prototype.readDeviceName = function (successCB, errorCB) {
        console.log("TODO");
        //this.readConfiguration(configNameUuid, successCB, errorCB);
    };
    BleExt.prototype.writeDeviceName = function (value, successCB, errorCB) {
        console.log("TODO");
    };
    BleExt.prototype.readDeviceType = function (successCB, errorCB) {
        console.log("TODO");
        //this.readConfiguration(configNameUuid, successCB, errorCB);
    };
    BleExt.prototype.writeDeviceType = function (value, successCB, errorCB) {
        console.log("TODO");
    };
    BleExt.prototype.readFloor = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(selectConfigurationCharacteristicUuid) ||
            !this.characteristics.hasOwnProperty(getConfigurationCharacteristicUuid)) {
            errorCB();
            return;
        }
        this.ble.getFloor(this.targetAddress, successCB, errorCB);
    };
    BleExt.prototype.writeFloor = function (value, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
            errorCB();
            return;
        }
        this.ble.setFloor(this.targetAddress, value, successCB, errorCB);
    };
    BleExt.prototype.readRoom = function (successCB, errorCB) {
        console.log("TODO");
        //this.readConfiguration(configNameUuid, successCB, errorCB);
    };
    BleExt.prototype.writeRoom = function (value, successCB, errorCB) {
        console.log("TODO");
    };
    // TODO: value should be an object with ssid and pw
    BleExt.prototype.writeWifi = function (value, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
            errorCB();
            return;
        }
        console.log("Set wifi to " + value);
        this.ble.setWifi(this.targetAddress, value, successCB, errorCB);
    };
    // TODO: value should be an object with ssid and pw
    BleExt.prototype.connectAndWriteWifi = function (address, value, successCB, errorCB) {
        function func(successCB, errorCB) {
            this.writeWifi(value, successCB, errorCB);
        }
        this.connectExecuteAndDisconnect(address, generalServiceUuid, setConfigurationCharacteristicUuid, func, successCB, errorCB);
    };
    BleExt.prototype.readIp = function (successCB, errorCB) {
        this.readConfiguration(configWifiUuid, successCB, errorCB);
    };
    // TODO: should we also discover selectConfigurationCharacteristicUuid ? Seems like we're just lucky now.
    BleExt.prototype.connectAndReadIp = function (address, successCB, errorCB) {
        function func(successCB, errorCB) {
            this.readIp(successCB, errorCB);
        }
        this.connectExecuteAndDisconnect(address, generalServiceUuid, getConfigurationCharacteristicUuid, func, successCB, errorCB);
    };
    //////////////////////////
    // Localization service //
    //////////////////////////
    BleExt.prototype.readTrackedDevices = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(deviceListUuid)) {
            errorCB();
            return;
        }
        this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
    };
    BleExt.prototype.writeTrackedDevice = function (deviceAddress, rssiThreshold, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(addTrackedDeviceUuid)) {
            errorCB();
            return;
        }
        console.log("TODO");
    };
    BleExt.prototype.readScannedDevices = function (successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(deviceListUuid)) {
            errorCB();
            return;
        }
        this.ble.listDevices(this.targetAddress, successCB); //TODO: should have an errorCB
    };
    BleExt.prototype.writeScanDevices = function (scan, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(deviceScanUuid)) {
            errorCB();
            return;
        }
        this.ble.scanDevices(this.targetAddress, scan); //TODO: needs callbacks
        if (successCB)
            setTimeout(successCB(), 1000);
    };
    /* Makes the crownstone scan for other devices and report the result
     */
    BleExt.prototype.scanForDevices = function (successCB, errorCB) {
        // Enable scanning
        this.writeScanDevices(true, function () {
            setTimeout(stopScanAndReadResult, 10000);
        }, errorCB);
        // Stop scanning and read result
        function stopScanAndReadResult() {
            this.writeScanDevices(false, this.readScannedDevices(successCB, errorCB), errorCB);
        }
    };
    return BleExt;
})();
