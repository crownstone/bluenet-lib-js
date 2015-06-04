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
        //	closestRssi = -128;
        //	closestAddress = "";
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
    BleExt.prototype.setConnectListener = function (func) {
        this.onConnectCallback = func;
    };
    BleExt.prototype.setTarget = function (address) {
        this.targetAddress = address;
    };
    BleExt.prototype.getDeviceList = function () { return this.devices; };
    BleExt.prototype.getState = function () { return this.state; };
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
    BleExt.prototype.writeMeshMessage = function (obj, successCB, errorCB) {
        if (!this.characteristics.hasOwnProperty(meshCharacteristicUuid)) {
            errorCB();
            return;
        }
        console.log("Send mesh message: ", obj);
        this.ble.writeMeshMessage(this.targetAddress, obj, successCB, errorCB);
    };
    BleExt.prototype.writeConfiguration = function (obj, callback) {
        if (!this.characteristics.hasOwnProperty(setConfigurationCharacteristicUuid)) {
            return;
        }
        console.log("Set config");
        this.ble.writeConfiguration(this.targetAddress, obj, callback);
    };
    BleExt.prototype.connectAndDiscover = function (address, serviceUuid, characteristicUuid, successCB, errorCB) {
        function connectionSuccess() {
            if (this.characteristics.hasOwnProperty(characteristicUuid)) {
                if (successCB)
                    successCB();
            }
            else {
                this.ble.discoverCharacteristic(address, serviceUuid, characteristicUuid, successCB, function discoveryFailure(msg) {
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
            connectionSuccess, function connectionFailure(msg) {
                if (errorCB)
                    errorCB(msg);
            });
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
        this.connectAndDiscover(address, serviceUuid, characteristicUuid, discoverSuccess, errorCB);
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
    return BleExt;
})();
