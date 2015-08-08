(function() {

    var _ = require('underscore'),
    	Socket = require('socket.io-client'),
    	EventTable = require('./src/EventTable'),
    	BlingInstance = require('./src/BlingInstance');

	var handleMessage = function(msg) {
		var data = JSON.parse(msg);
		if (Bling.blings[data.bling]){
			if (EventTable[data.type]){
				EventTable[data.type](Bling.blings[data.bling], data);
			} else {
				Bling.blings[data.bling].emit('status', data, data.timestamp);
			}
		}
	};

	Bling = {
		options: {
			socket_url : 'http://localhost:3000/bling'
		},
		blings: [],
		create : function(options) {
			var id = Bling.blings.length;
			if (!Bling.socket) Bling.initSocket();
			options = options || {};
			var newBling = new BlingInstance(id, Bling.socket, _.extend(Bling.options, options));
			Bling.blings[id] = newBling;
			Bling.socket.emit('message', JSON.stringify({
		        "command": "connect",
		        "bling_count": Bling.blings.length
		    }));
			return newBling;
		},
		initSocket : function() {
			Bling.socket = Socket(Bling.options.socket_url);
			Bling.socket.on('message', handleMessage);
		}
	};

	if (typeof module !== 'undefined') module.exports = Bling;

})();
