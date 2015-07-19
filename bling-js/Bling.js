(function(){

	// var Socket;
	// if (typeof window === 'undefined') {
	// 	Socket = require('ws');
	// } else {
	// 	if (!("WebSocket" in window)) {
	// 		console.error('bling-js: Sockets not supported.');
	// 	}
	// 	Socket = WebSocket;
	// }

    var _ = require('underscore'),
    	Socket = require('socket.io-client');
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

		// create : function(id, options) {
		create : function(options) {
			// if (!id) id = 0;
			// if (Bling.blings[id]) return Bling.blings[id];
			var id = Bling.blings.length;
			if (!Bling.socket) Bling.initSocket();
			// if (typeof id === "object") options = id;
			options = options || {};
			var newBling = new BlingInstance(id, Bling.socket, _.extend(Bling.options, options));
			Bling.blings[id] = newBling;
			Bling.socket.emit('message', JSON.stringify(["command", {
		        "command": "connect",
		        "bling_count": Bling.blings.length
		    }]));
			return newBling;
		},

		// onError : function(){
		// 	throw 'bling-js had an error with the socket. Please check the connection.';
		// },

		initSocket : function() {
			//Bling.socket = new Socket(Bling.options.socket_url);
			Bling.socket = Socket(Bling.options.socket_url);
			Bling.socket.on('message', handleMessage);
			//Bling.socket.onmessage = handleMessage;
			// Bling.socket.onerror = Bling.onError;
		}
	};
	if (typeof module !== 'undefined') module.exports = Bling;
})();
