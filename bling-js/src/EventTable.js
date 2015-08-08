if (typeof module !== 'undefined') module.exports = {
	'gesture' : function(bling, data){
		bling.emit('gesture', data.gesture);
		bling.lastGesture = data.gesture;
	},
	'rssi' : function(bling, data) {
		bling.emit('bluetooth_strength', data.rssi, data.timestamp);
	},
	'imu' : function(bling, data) {
		var imu_data = {
			acceleration : {
				x : data.acceleration.x,
				y : data.acceleration.y,
				z : data.acceleration.z
			},
			gyroscope : {
				x : data.gyroscope.x,
				y : data.gyroscope.y,
				z : data.gyroscope.z
			}
		};
		if (!bling.lastIMU) bling.lastIMU = imu_data;
		bling.emit('imu', imu_data, data.timestamp);
		bling.lastIMU = imu_data;
	},
	'connected' : function(bling, data) {
		bling.isConnected = true;
		bling.emit(data.type, data, data.timestamp);
		bling.emit('status', data, data.timestamp);
	},
	'disconnected' : function(bling, data) {
		bling.isConnected = false;
		bling.emit(data.type, data, data.timestamp);
		bling.emit('status', data, data.timestamp);
	}
};
