//////////////////////////////////////////////////////////////////////////////
// Indoor Localization Service
var indoorLocalizationServiceUuid =          '7e170000-429c-41aa-83d7-d91220abeb33';
// Indoor Localization Service - Characteristics
var rssiUuid =                               '7e170001-429c-41aa-83d7-d91220abeb33';
var addTrackedDeviceUuid =                   '7e170002-429c-41aa-83d7-d91220abeb33';
var deviceScanUuid =                         '7e170003-429c-41aa-83d7-d91220abeb33';
var deviceListUuid =                         '7e170004-429c-41aa-83d7-d91220abeb33';
var listTrackedDevicesUuid =                 '7e170005-429c-41aa-83d7-d91220abeb33';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// General Service
var generalServiceUuid =                     'f5f90000-59f9-11e4-aa15-123b93f75cba';
// General Service - Characteristics
var temperatureCharacteristicUuid =          'f5f90001-59f9-11e4-aa15-123b93f75cba';
var changeNameCharacteristicUuid =           'f5f90002-59f9-11e4-aa15-123b93f75cba';
var deviceTypeUuid =                         'f5f90003-59f9-11e4-aa15-123b93f75cba';
var roomUuid =                               'f5f90004-59f9-11e4-aa15-123b93f75cba';
var resetCharacteristicUuid =                'f5f90005-59f9-11e4-aa15-123b93f75cba';
var meshCharacteristicUuid =                 'f5f90006-59f9-11e4-aa15-123b93f75cba';
var setConfigurationCharacteristicUuid =     'f5f90007-59f9-11e4-aa15-123b93f75cba';
var selectConfigurationCharacteristicUuid =  'f5f90008-59f9-11e4-aa15-123b93f75cba';
var getConfigurationCharacteristicUuid =     'f5f90009-59f9-11e4-aa15-123b93f75cba';

//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Power Service
var powerServiceUuid =                       '5b8d0000-6f20-11e4-b116-123b93f75cba';
// Power Service - Characteristics
var pwmUuid =                                '5b8d0001-6f20-11e4-b116-123b93f75cba';
var sampleCurrentUuid =                      '5b8d0002-6f20-11e4-b116-123b93f75cba';
var currentCurveUuid =                       '5b8d0003-6f20-11e4-b116-123b93f75cba';
var currentConsumptionUuid =                 '5b8d0004-6f20-11e4-b116-123b93f75cba';
var currentLimitUuid =                       '5b8d0005-6f20-11e4-b116-123b93f75cba';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Configuration types
var configNameUuid                               = 0x00;
var configDeviceTypeUuid                         = 0x01;
var configRoomUuid                               = 0x02;
var configFloorUuid                              = 0x03;
var configNearbyTimeoutUuid                      = 0x04;
var configPWMFreqUuid                            = 0x05;
var configIBeaconMajorUuid                       = 0x06;
var configIBeaconMinorUuid                       = 0x07;
var configIBeaconUuidUuid                        = 0x08;
var configIBeaconRSSIUuid                        = 0x09;
var configWifiUuid                               = 0x0A;

// Value set at reserved bytes for allignment
var RESERVED = 0x00;

//////////////////////////////////////////////////////////////////////////////
// Mesh messages
var channelData = 0x02;
var meshTypePwm =            0x01;
var meshTypeBeaconConfig =   0x02;

//////////////////////////////////////////////////////////////////////////////
var APPLE_COMPANY_ID = 0x004c;
var IBEACON_ADVERTISEMENT_ID = 0x0215;

//////////////////////////////////////////////////////////////////////////////
