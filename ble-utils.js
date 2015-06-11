/*
 * Expand functionality of standard tyopes
 */

String.prototype.insert = function (index, string) {
    if (index > 0)
        return this.substring(0, index) + string + this.substring(index, this.length);
    else
        return string + this;
};

/*
 * Conversions between uint8 array and uint16 or uint32
 */
var uint16ToByteArray = function (value) {
    var u8 = new Uint8Array(2);
    u8[0] = (value >> 0 & 0xFF);
    u8[1] = (value >> 8 & 0xFF);
    return u8;
};
var uint32ToByteArray = function (value) {
    var u8 = new Uint8Array(4);
    u8[0] = (value >> 0 & 0xFF);
    u8[1] = (value >> 8 & 0xFF);
    u8[2] = (value >> 16 & 0xFF);
    u8[3] = (value >> 24 & 0xFF);
    return u8;
};
var byteArrayToUint32 = function (u8, startIndex) {
    return (u8[startIndex+3] << 24) + (u8[startIndex+2] << 16) + (u8[startIndex+1] << 8) + u8[startIndex];
};
var byteArrayToUint16 = function (u8, startIndex) {
    return (u8[startIndex+1] << 8) + u8[startIndex];
};


/*
 * Conversions between uint8 array and strings
 */
/*
 * Conversions from number to hex string
 */
/*
 * Conversions from hex strings to number array
 */
var hexStringToByteArray = function (value) {
    var strArr = [];
    if (value.indexOf(':') > -1) {
        strArr = value.split(':');
    }
    else if (value.indexOf('-') > -1) {
        strArr = value.split('-');
    }
    else {
        for (var i = 0; i < value.length / 2; i++) {
            strArr[i] = value.slice(i * 2, i * 2 + 2);
        }
    }
    var arr = new Uint8Array(strArr.length);
    for (var i = 0; i < strArr.length; i++) {
        arr[i] = parseInt(strArr[i], 16);
    }
    return arr;
};
var byteArrayTohexString = function (value) {
};
/*
 * Conversion between hex string and bluetooth address
 */
var hexStringToBluetoothAddress = function (value) {
    var arrInv = hexStringToByteArray(value);
    if (arrInv.length != 6) {
        return [];
    }
    var arr = new Uint8Array(6);
    for (var i = 0; i < 6; i++) {
        arr[5 - i] = arrInv[i];
    }
    return arr;
};
