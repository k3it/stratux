angular.module('appControllers').controller('StatusCtrl', StatusCtrl); // get the main module contollers set
StatusCtrl.$inject = ['$rootScope', '$scope', '$state', '$http', '$interval']; // Inject my dependencies

// create our controller function with all necessary logic
function StatusCtrl($rootScope, $scope, $state, $http, $interval) {

	$scope.$parent.helppage = 'plates/status-help.html';

	function connect($scope) {
		if (($scope === undefined) || ($scope === null))
			return; // we are getting called once after clicking away from the status page

		if (($scope.socket === undefined) || ($scope.socket === null)) {
			socket = new WebSocket(URL_STATUS_WS);
			$scope.socket = socket; // store socket in scope for enter/exit usage
		}

		$scope.ConnectState = "Disconnected";

		socket.onopen = function (msg) {
			// $scope.ConnectStyle = "label-success";
			$scope.ConnectState = "Connected";
		};

		socket.onclose = function (msg) {
			// $scope.ConnectStyle = "label-danger";
			$scope.ConnectState = "Disconnected";
			$scope.$apply();
			delete $scope.socket;
			setTimeout(function() {connect($scope);}, 1000);
		};

		socket.onerror = function (msg) {
			// $scope.ConnectStyle = "label-danger";
			$scope.ConnectState = "Error";
			$scope.$apply();
		};

		socket.onmessage = function (msg) {
			//console.log('Received status update.')

			var status = JSON.parse(msg.data)
			// Update Status
			$scope.Version = status.Version;
			$scope.Build = status.Build.substr(0, 10);
			$scope.Devices = status.Devices;
			$scope.Ping_connected = status.Ping_connected;
			$scope.Connected_Users = status.Connected_Users;
			$scope.UAT_messages_last_minute = status.UAT_messages_last_minute;
			$scope.UAT_messages_max = status.UAT_messages_max;
			$scope.ES_messages_last_minute = status.ES_messages_last_minute;
			$scope.ES_messages_max = status.ES_messages_max;
			$scope.FLARM_messages_last_minute = status.FLARM_messages_last_minute;
			$scope.FLARM_messages_max = status.FLARM_messages_max;
			$scope.FLARM_connected = status.FLARM_connected;
			$scope.GPS_satellites_locked = status.GPS_satellites_locked;
			$scope.GPS_satellites_tracked = status.GPS_satellites_tracked;
			$scope.GPS_satellites_seen = status.GPS_satellites_seen;
			$scope.GPS_solution = status.GPS_solution;

			switch(status.GPS_solution) {
				case "Disconnected":
				case "No Fix":
				case "Unknown":
					$scope.GPS_position_accuracy = "";
					break;
				default:
					$scope.GPS_position_accuracy = ", " + status.GPS_position_accuracy.toFixed(1) + " m";
			}
			var gpsHardwareCode = (status.GPS_detected_type & 0x0f);
			var tempGpsHardwareString = "Not installed";
			switch(gpsHardwareCode) {
				case 1:
					tempGpsHardwareString = "Serial port";
					break;
				case 2:
					tempGpsHardwareString = "Prolific USB-serial bridge";
					break;
				case 6:
					tempGpsHardwareString = "USB u-blox 6 GPS receiver";
					break;
				case 7:
					tempGpsHardwareString = "USB u-blox 7 GNSS receiver";
					break;
				case 8:
					tempGpsHardwareString = "USB u-blox 8 GNSS receiver";
					break;
				default:
					tempGpsHardwareString = "Not installed";
			}
			$scope.GPS_hardware = tempGpsHardwareString;
			var gpsProtocol = (status.GPS_detected_type >> 4);
			var tempGpsProtocolString = "Not communicating";
			switch(gpsProtocol) {
				case 1:
					tempGpsProtocolString = "NMEA protocol";
					break;
				case 3:
					tempGpsProtocolString = "NMEA-UBX protocol";
					break;
				default:
					tempGpsProtocolString = "Not communicating";
			}
			$scope.GPS_protocol = tempGpsProtocolString;

			var MiBFree = status.DiskBytesFree/1048576;
			$scope.DiskSpace = MiBFree.toFixed(1);

			$scope.UAT_METAR_total = status.UAT_METAR_total;
			$scope.UAT_TAF_total = status.UAT_TAF_total;
			$scope.UAT_NEXRAD_total = status.UAT_NEXRAD_total;
			$scope.UAT_SIGMET_total = status.UAT_SIGMET_total;
			$scope.UAT_PIREP_total = status.UAT_PIREP_total;
			$scope.UAT_NOTAM_total = status.UAT_NOTAM_total;
			$scope.UAT_OTHER_total = status.UAT_OTHER_total;
			// Errors array.
			if (status.Errors.length > 0) {
				$scope.visible_errors = true;
				$scope.Errors = status.Errors;
			}

			var uptime = status.Uptime;
			if (uptime != undefined) {
				var up_d = parseInt((uptime/1000) / 86400),
				    up_h = parseInt((uptime/1000 - 86400*up_d) / 3600),
				    up_m = parseInt((uptime/1000 - 86400*up_d - 3600*up_h) / 60),
				    up_s = parseInt((uptime/1000 - 86400*up_d - 3600*up_h - 60*up_m));
				$scope.Uptime = String(up_d + "/" + ((up_h < 10) ? "0" + up_h : up_h) + ":" + ((up_m < 10) ? "0" + up_m : up_m) + ":" + ((up_s < 10) ? "0" + up_s : up_s));
			} else {
				// $('#Uptime').text('unavailable');
			}
			var boardtemp = status.CPUTemp;
			if (boardtemp != undefined) {
				/* boardtemp is celcius to tenths */
				$scope.CPUTemp = String(boardtemp.toFixed(1) + '°C / ' + ((boardtemp * 9 / 5) + 32.0).toFixed(1) + '°F');
				$scope.CPUTempMin = String(status.CPUTempMin.toFixed(1)) + '°C';
				$scope.CPUTempMax = String(status.CPUTempMax.toFixed(1)) + '°C';				
			} else {
				// $('#CPUTemp').text('unavailable');
			}

			$scope.$apply(); // trigger any needed refreshing of data
		};
	}

	function setHardwareVisibility() {
		$scope.visible_uat = true;
		$scope.visible_es = true;
		$scope.visible_gps = true;

		// Simple GET request example (note: responce is asynchronous)
		$http.get(URL_SETTINGS_GET).
		then(function (response) {
			settings = angular.fromJson(response.data);
			$scope.DeveloperMode = settings.DeveloperMode;
			$scope.visible_uat = settings.UAT_Enabled;
			$scope.visible_es = settings.ES_Enabled;
			$scope.visible_flarm = settings.FLARM_Enabled;
			$scope.visible_ping = settings.Ping_Enabled;
			if (settings.Ping_Enabled) {
				$scope.visible_uat = true;
				$scope.visible_es = true;
			}
			$scope.visible_gps = settings.GPS_Enabled;
		}, function (response) {
			// nop
		});
	};

	function getTowers() {
		// Simple GET request example (note: responce is asynchronous)
		$http.get(URL_TOWERS_GET).
		then(function (response) {
			var towers = angular.fromJson(response.data);
			var cnt = 0;
			for (var key in towers) {
				if (towers[key].Messages_last_minute > 0) {
					cnt++;
				}
			}
			$scope.UAT_Towers = cnt;
			// $scope.$apply();
		}, function (response) {
			$scope.raw_data = "error getting tower data";
		});
	};

	// periodically get the tower list
	var updateTowers = $interval(function () {
		// refresh tower count once each 5 seconds (aka polling)
		getTowers();
	}, (5 * 1000), 0, false);

    var clicks = 0;
    var clickSeconds = 0;
    var DeveloperModeClick = 0;

    var clickInterval = $interval(function () {
        if ((clickSeconds >= 3))
            clicks=0;
        clickSeconds++;
    }, 1000);

	$state.get('home').onEnter = function () {
		// everything gets handled correctly by the controller
	};
	$state.get('home').onExit = function () {
		if (($scope.socket !== undefined) && ($scope.socket !== null)) {
			$scope.socket.close();
			$scope.socket = null;
		}
		$interval.cancel(updateTowers);
	};

    $scope.VersionClick = function() {
        if (clicks==0)
        {
            clickSeconds = 0;
        }
        ++clicks;
        if ((clicks > 7) && (clickSeconds < 3))
        {
            clicks=0;
            clickSeconds=0;
            DeveloperModeClick = 1;
            $http.get(URL_DEV_TOGGLE_GET);
            location.reload();
        }
    }

    $scope.GetDeveloperModeClick = function() {
        return DeveloperModeClick;
    }
	// Status Controller tasks
	setHardwareVisibility();
	connect($scope); // connect - opens a socket and listens for messages
};
