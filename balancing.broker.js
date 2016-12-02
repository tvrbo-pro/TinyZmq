const zmq = require('zmq');
const frontend = zmq.socket('router');
const backend  = zmq.socket('dealer');

function bind(parameters){
	if(!parameters || !parameters.clientsPort || !parameters.workersPort)
		throw new Error("ERROR: clientsPort and workersPort are expected in order to start the broker");

	console.log(`[TinyZMQ] Binding to ports ${parameters.clientsPort} and ${parameters.workersPort}...`);

	frontend.bindSync(`tcp://*:${parameters.clientsPort}`);
	backend.bindSync(`tcp://*:${parameters.workersPort}`);

	console.log(`[TinyZMQ] Listening on ${parameters.clientsPort} and ${parameters.workersPort}`);
}

frontend.on('message', function() {
  // Note that separate message parts come as function arguments.
  var args = Array.apply(null, arguments);
  // Pass array of strings/buffers to send multipart messages.
  backend.send(args);
});

backend.on('message', function() {
  var args = Array.apply(null, arguments);
  frontend.send(args);
});

module.exports = {
	bind
};
