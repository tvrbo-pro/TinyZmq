const zmq = require('zmq');
const config = require('./config.js');
const incomingSocket = zmq.socket('rep');
const outcomingSocket  = zmq.socket('pub');

function bind(parameters){
	if(!parameters || !parameters.clientsPort || !parameters.subscribersPort)
		throw new Error("ERROR: clientsPort and subscribersPort are expected in order to start the broker");

	console.log(`[TinyZMQ] Binding to ports ${parameters.clientsPort} and ${parameters.subscribersPort}...`);

	incomingSocket.bindSync(`tcp://*:${parameters.clientsPort}`);
	outcomingSocket.bindSync(`tcp://*:${parameters.subscribersPort}`);

	console.log(`[TinyZMQ] Listening on ${parameters.clientsPort} and ${parameters.subscribersPort}`);
}

// REQUEST BROADCASTING
incomingSocket.on('message', function(data) {
	if(data.toString() == 'ping')
		return incomingSocket.send('pong');  // ACK

  outcomingSocket.send(data);  // BROADCAST
	incomingSocket.send('');  // ACK
});

// HEARTBEAT
setInterval(function(){
	outcomingSocket.send('ping');
}, config.PING_BASE_INTERVAL);

module.exports = {
	bind
};
