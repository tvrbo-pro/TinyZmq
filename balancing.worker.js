const zmq = require('zmq');
const config = require('./config.js');
const procSignals = ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGTERM'/*, 'SIGUSR2'*/];

// STATE

var brokerURI;
var responder;
var initialized = false;
var terminating = false;
var notifyWorker;
var lastActivity = Date.now();

function init(){
	if(initialized) return;
	initialized = true;

	// Internal health checks
	setInterval(checkHealth, config.PING_BASE_INTERVAL + 100);

	// Termination handlers
	procSignals.forEach(sig => process.on(sig, onTerminate) );
}

function checkHealth() {
	if(terminating) return;
	else if(!responder) return lastActivity = Date.now();
	else if((Date.now() - lastActivity) >= config.INACTIVITY_TIMEOUT) {
		// Reset clock
		lastActivity = Date.now();

		console.error(`[TinyZMQ] WARNING: No heartbeat from clients for ${config.INACTIVITY_TIMEOUT / 1000} seconds`);
		reconnect();
	}
}

// MESSAGE HANDLER
function onRequest(requestBuffer) {
	let requestPayload;
	lastActivity = Date.now();
	if(requestBuffer.length == 4 && requestBuffer.toString() == 'ping') return responder.send('pong'); // done
	else if(!notifyWorker) return console.error('ERROR: No worker callback is registered. Ignoring request.');

	try {
		requestPayload = JSON.parse(requestBuffer.toString());
	}
	catch(err) {
		console.error("[TinyZMQ] Got an invalid request: ", requestBuffer.toString());
		responder.send(JSON.stringify({error: true, message: "Unable to parse the payload"}));
		return;
	}

	// DO WORK
	notifyWorker(requestPayload.parameters, function(response){
		let responsePayload = {
			id: requestPayload.id,
			response
		};
    responder.send(JSON.stringify(responsePayload));
	});
}

// Lifecycle

function connect(uri, workerCallback){
	if(terminating) return;
	else if(!initialized) {
		if(!uri || typeof uri != "string" || !uri.length)
			throw new Error('[TinyZMQ] ERROR: expected the broker URI to connect the worker to');
		else if(!workerCallback || typeof workerCallback != 'function') 
			throw new Error('[TinyZMQ] ERROR: expected a callback function to notify the worker');

		brokerURI = uri;
		notifyWorker = workerCallback;
	}
	else { // already on
		if(uri == brokerURI) { // no need to connect
			if(typeof workerCallback == 'function')
				notifyWorker = workerCallback;
			else
				console.log('[TinyZMQ] WARNING: Connection already established to the broker');
			return;
		}
		else if(!uri || typeof uri != "string" || !uri.length)
			throw new Error('[TinyZMQ] ERROR: expected the broker URI to connect the worker to');
		else if(responder) {
			console.log('[TinyZMQ] WARNING: Connecting to another broker URI. Closing the previous connection.');
			responder.close();
			brokerURI = uri;
		}

		if(typeof workerCallback == 'function')
			notifyWorker = workerCallback;
	}

	// INITIALIZE
	init();

	// CONNECT TO THE BROKER
	responder = zmq.socket('rep');
	responder.on('message', onRequest);

	if(config.DEBUG) {
		// Register to monitoring events
		responder.on('connect', function(fd, ep) {console.log('[TinyZMQ] Connect');});
		responder.on('connect_delay', function(fd, ep) {console.log('[TinyZMQ] Connect delay');});
		responder.on('connect_retry', function(fd, ep) {console.log('[TinyZMQ] Connect retry');});
		responder.on('listen', function(fd, ep) {console.log('[TinyZMQ] Listen');});
		responder.on('bind_error', function(fd, ep) {console.log('[TinyZMQ] Bind error');});
		responder.on('accept', function(fd, ep) {console.log('[TinyZMQ] Accept');});
		responder.on('accept_error', function(fd, ep) {console.log('[TinyZMQ] Accept_error');});
		responder.on('close', function(fd, ep) {console.log('[TinyZMQ] Close');});
		responder.on('close_error', function(fd, ep) {console.log('[TinyZMQ] Close_error');});
		responder.on('disconnect', function(fd, ep) {console.log('[TinyZMQ] WARNING: Disconnected');});

		// Handle monitor error
		responder.on('monitor_error', function(err) {
			console.log('[TinyZMQ] WARNING: Error in monitoring: %s, will restart monitoring in .5 seconds', err);
			setTimeout(function() { responder.monitor(500, 0); }, 500);
		});

		responder.monitor(500, 0);
	}

	// READY
	responder.connect(brokerURI);
}

function reconnect(){
	if(terminating) return;

	console.error("[TinyZMQ] Trying to reconnect...");
	responder.close();

	setTimeout(function(){
		// CONNECT TO THE BROKER
		responder = zmq.socket('rep');
		responder.on('message', onRequest);

		if(config.DEBUG) {
			// Register to monitoring events
			responder.on('connect', function(fd, ep) {console.log('[TinyZMQ] Connect');});
			responder.on('connect_delay', function(fd, ep) {console.log('[TinyZMQ] Connect delay');});
			responder.on('connect_retry', function(fd, ep) {console.log('[TinyZMQ] Connect retry');});
			responder.on('listen', function(fd, ep) {console.log('[TinyZMQ] Listen');});
			responder.on('bind_error', function(fd, ep) {console.log('[TinyZMQ] Bind error');});
			responder.on('accept', function(fd, ep) {console.log('[TinyZMQ] Accept');});
			responder.on('accept_error', function(fd, ep) {console.log('[TinyZMQ] Accept_error');});
			responder.on('close', function(fd, ep) {console.log('[TinyZMQ] Close');});
			responder.on('close_error', function(fd, ep) {console.log('[TinyZMQ] Close_error');});
			responder.on('disconnect', function(fd, ep) {console.log('[TinyZMQ] WARNING: Disconnected');});

			// Handle monitor error
			responder.on('monitor_error', function(err) {
				console.log('[TinyZMQ] WARNING: Error in monitoring: %s, will restart monitoring in .5 seconds', err);
				setTimeout(function() { responder.monitor(500, 0); }, 500);
			});

			responder.monitor(500, 0);
		}

		// READY
		responder.connect(brokerURI);
	}, 50);
}

function onTerminate(code){
	console.log("\n[TinyZMQ] The process is terminating", code || '');

	terminating = true;
	if(responder) {
		try {
			// responder.disconnect(config.MATCHER_WORKER_URI);
			responder.close(config.MATCHER_WORKER_URI);
		}
		catch(e){ ; }
	}
	process.exit(0);
}

module.exports = {
	connect // this function gets the callback to execute when a matching request is received
};
