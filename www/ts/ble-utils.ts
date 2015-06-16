
/*
 * Conversions between uint8 array and uint16 or uint32
 */

var BleUtils = {
	uint16ToByteArray : function(value) {
		var u8 = new Uint8Array(2);
		u8[0] = (value >> 0 & 0xFF);
		u8[1] = (value >> 8 & 0xFF);
		return u8;
	},

	uint32ToByteArray : function(value) {
		var u8 = new Uint8Array(4);
		u8[0] = (value >> 0 & 0xFF);
		u8[1] = (value >> 8 & 0xFF);
		u8[2] = (value >> 16 & 0xFF);
		u8[3] = (value >> 24 & 0xFF);
		return u8;
	},

	byteArrayToUint32 : function (u8, startIndex) {
		return (u8[startIndex+3] << 24) + (u8[startIndex+2] << 16) + (u8[startIndex+1] << 8) + u8[startIndex];
	},

	byteArrayToUint16 : function (u8, startIndex) {
		return (u8[startIndex+1] << 8) + u8[startIndex];
	},


	/*
	 * Conversions between uint8 array and strings
	 */



	/*
	 * Conversions from number to hex string
	 */


	/*
	 * Conversions from hex strings to number array
	 */
	hexStringToByteArray : function(value) {
		var strArr = [];
		if (value.indexOf(':') > -1) {
			strArr = value.split(':');
		}
		else if (value.indexOf('-') > -1) {
			strArr = value.split('-');
		}
		else  {
			for (var i = 0; i < value.length/2; i++) {
				strArr[i] = value.slice(i*2, i*2+2);
			}
		}
		var arr = new Uint8Array(strArr.length);
		for (var i=0; i<strArr.length; i++) {
			arr[i] = parseInt(strArr[i], 16);
		}
		return arr;
	},

	byteArrayTohexString : function(value) {

	},

	/*
	 * Conversion between hex string and bluetooth address
	 */
	hexStringToBluetoothAddress : function(value) {
		var arrInv = BleUtils.hexStringToByteArray(value);
		if (arrInv.length != 6) {
			return new Uint8Array(0);
		}
		var arr = new Uint8Array(6);
		for (var i=0; i<6; i++) {
			arr[5-i] = arrInv[i];
		}
		return arr;
	},

	unsignedToSignedByte : function(value) {
		// make signed
		if (value > 127) {
			return value - 256;
		} else {
			return value;
		}
	},

};