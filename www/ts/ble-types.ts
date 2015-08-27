var BleTypes = {

	//////////////////////////////////////////////////////////////////////////////
	// Indoor Localization Service
	INDOOR_LOCALIZATION_SERVICE_UUID:       '7e170000-429c-41aa-83d7-d91220abeb33',
	// Indoor Localization Service - Characteristics
	CHAR_RSSI_UUID:                         '7e170001-429c-41aa-83d7-d91220abeb33',
	CHAR_ADD_TRACKED_DEVICE_UUID:           '7e170002-429c-41aa-83d7-d91220abeb33',
	CHAR_DEVICE_SCAN_UUID:                  '7e170003-429c-41aa-83d7-d91220abeb33',
	CHAR_DEVICE_LIST_UUID:                  '7e170004-429c-41aa-83d7-d91220abeb33',
	CHAR_LIST_TRACKED_DEVICES_UUID:         '7e170005-429c-41aa-83d7-d91220abeb33',
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// General Service
	GENERAL_SERVICE_UUID:                   'f5f90000-59f9-11e4-aa15-123b93f75cba',
	// General Service - Characteristics
	CHAR_TEMPERATURE_UUID:                  'f5f90001-59f9-11e4-aa15-123b93f75cba',
	// unused                               'f5f90002-59f9-11e4-aa15-123b93f75cba',
	// unused                               'f5f90003-59f9-11e4-aa15-123b93f75cba',
	// unused                               'f5f90004-59f9-11e4-aa15-123b93f75cba',
	CHAR_RESET_UUID:                        'f5f90005-59f9-11e4-aa15-123b93f75cba',
	CHAR_MESH_UUID:                         'f5f90006-59f9-11e4-aa15-123b93f75cba',
	CHAR_SET_CONFIGURATION_UUID:            'f5f90007-59f9-11e4-aa15-123b93f75cba',
	CHAR_SELECT_CONFIGURATION_UUID:         'f5f90008-59f9-11e4-aa15-123b93f75cba',
	CHAR_GET_CONFIGURATION_UUID:            'f5f90009-59f9-11e4-aa15-123b93f75cba',
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// Power Service
	POWER_SERVICE_UUID:                     '5b8d0000-6f20-11e4-b116-123b93f75cba',
	// Power Service - Characteristics
	CHAR_PWM_UUID:                          '5b8d0001-6f20-11e4-b116-123b93f75cba',
	CHAR_SAMPLE_CURRENT_UUID:               '5b8d0002-6f20-11e4-b116-123b93f75cba',
	CHAR_CURRENT_CURVE_UUID:                '5b8d0003-6f20-11e4-b116-123b93f75cba',
	CHAR_CURRENT_CONSUMPTION_UUID:          '5b8d0004-6f20-11e4-b116-123b93f75cba',
	CHAR_CURRENT_LIMIT_UUID:                '5b8d0005-6f20-11e4-b116-123b93f75cba',
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// DFU Service
	DFU_SERVICE_UUID:                       '00001530-1212-efde-1523-785feabcd123',
	// DFU Service - Characteristics
	CHAR_CONTROL_POINT_UUID:                '00001531-1212-efde-1523-785feabcd123',
	CHAR_PACKET_UUID:                       '00001532-1212-efde-1523-785feabcd123',
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// Device Information Service
	DEVICE_INFORMATION_UUID:                '180a',
	// Device Information Service - Characteristics
	CHAR_HARDWARE_REVISION_UUID:            '2a27',
	CHAR_FIRMWARE_REVISION_UUID:            '2a26',
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// Configuration types
	CONFIG_TYPE_NAME:                       0x00,
	CONFIG_TYPE_DEVICE_TYPE:                0x01,
	CONFIG_TYPE_ROOM:                       0x02,
	CONFIG_TYPE_FLOOR:                      0x03,
	CONFIG_TYPE_NEARBY_TIMEOUT:             0x04,
	CONFIG_TYPE_PWM_FREQUENCY:              0x05,
	CONFIG_TYPE_IBEACON_MAJOR:              0x06,
	CONFIG_TYPE_IBEACON_MINOR:              0x07,
	CONFIG_TYPE_IBEACON_PROXIMITY_UUID:     0x08,
	CONFIG_TYPE_IBEACON_RSSI:               0x09,
	CONFIG_TYPE_WIFI:                       0x0A,
	CONFIG_TYPE_TX_POWER:                   0x0B,
	CONFIG_TYPE_ADV_INTERVAL:               0x0C,
	CONFIG_TYPE_PASSKEY:                    0x0D,
	CONFIG_TYPE_MIN_ENV_TEMP:               0x0E,
	CONFIG_TYPE_MAX_ENV_TEMP:               0x0F,

	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// Value set at reserved bytes for allignment
	RESERVED:                               0x00,
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// Mesh messages
	CHANNEL_DATA:                           0x02,
	MESH_TYPE_PWM:                          0x01,
	MESH_TYPE_BEACON_CONFIG:                0x02,
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// iBeacon Identifiers
	APPLE_COMPANY_ID:                       0x004c,
	IBEACON_ADVERTISEMENT_ID:               0x0215,
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	// Reset OP codes
	RESET_DEFAULT:                          1,
	RESET_BOOTLOADER:                       66,
	//////////////////////////////////////////////////////////////////////////////

};
