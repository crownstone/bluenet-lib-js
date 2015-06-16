var BleTypes = {

//////////////////////////////////////////////////////////////////////////////
// Indoor Localization Service
	indoorLocalizationServiceUuid: '7e170000-429c-41aa-83d7-d91220abeb33',
// Indoor Localization Service - Characteristics
	rssiUuid: '7e170001-429c-41aa-83d7-d91220abeb33',
	addTrackedDeviceUuid: '7e170002-429c-41aa-83d7-d91220abeb33',
	deviceScanUuid: '7e170003-429c-41aa-83d7-d91220abeb33',
	deviceListUuid: '7e170004-429c-41aa-83d7-d91220abeb33',
	listTrackedDevicesUuid: '7e170005-429c-41aa-83d7-d91220abeb33',
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// General Service
	generalServiceUuid: 'f5f90000-59f9-11e4-aa15-123b93f75cba',
// General Service - Characteristics
	temperatureCharacteristicUuid: 'f5f90001-59f9-11e4-aa15-123b93f75cba',
	changeNameCharacteristicUuid: 'f5f90002-59f9-11e4-aa15-123b93f75cba',
	deviceTypeUuid: 'f5f90003-59f9-11e4-aa15-123b93f75cba',
	roomUuid: 'f5f90004-59f9-11e4-aa15-123b93f75cba',
	resetCharacteristicUuid: 'f5f90005-59f9-11e4-aa15-123b93f75cba',
	meshCharacteristicUuid: 'f5f90006-59f9-11e4-aa15-123b93f75cba',
	setConfigurationCharacteristicUuid: 'f5f90007-59f9-11e4-aa15-123b93f75cba',
	selectConfigurationCharacteristicUuid: 'f5f90008-59f9-11e4-aa15-123b93f75cba',
	getConfigurationCharacteristicUuid: 'f5f90009-59f9-11e4-aa15-123b93f75cba',

//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Power Service
	powerServiceUuid: '5b8d0000-6f20-11e4-b116-123b93f75cba',
// Power Service - Characteristics
	pwmUuid: '5b8d0001-6f20-11e4-b116-123b93f75cba',
	sampleCurrentUuid: '5b8d0002-6f20-11e4-b116-123b93f75cba',
	currentCurveUuid: '5b8d0003-6f20-11e4-b116-123b93f75cba',
	currentConsumptionUuid: '5b8d0004-6f20-11e4-b116-123b93f75cba',
	currentLimitUuid: '5b8d0005-6f20-11e4-b116-123b93f75cba',
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Configuration types
	configNameUuid: 0x00,
	configDeviceTypeUuid: 0x01,
	configRoomUuid: 0x02,
	configFloorUuid: 0x03,
	configNearbyTimeoutUuid: 0x04,
	configPWMFreqUuid: 0x05,
	configIBeaconMajorUuid: 0x06,
	configIBeaconMinorUuid: 0x07,
	configIBeaconUuidUuid: 0x08,
	configIBeaconRssiUuid: 0x09,
	configWifiUuid: 0x0A,

// Value set at reserved bytes for allignment
	RESERVED: 0x00,

//////////////////////////////////////////////////////////////////////////////
// Mesh messages
	channelData: 0x02,
	meshTypePwm: 0x01,
	meshTypeBeaconConfig: 0x02,

//////////////////////////////////////////////////////////////////////////////
	APPLE_COMPANY_ID: 0x004c,
	IBEACON_ADVERTISEMENT_ID: 0x0215,

//////////////////////////////////////////////////////////////////////////////
};