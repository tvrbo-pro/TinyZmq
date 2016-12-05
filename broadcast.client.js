const zmq = require('zmq');
const uuid = require('uuid');
const config = require('./config.js');
const procSignals = ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGTERM'/*, 'SIGUSR2'*/];

const PING_INTERVAL = Math.floor(config.PING_BASE_INTERVAL * config.WORKER_INSTANCES / config.CLIENT_INSTANCES) - 10;

// STATE

var requester;
var brokerURI;
var initialized = false;
var terminating = false;
var lastActivity = Date.now();

function init() {
	if(initialized) return;
	initialized = true;

	// Internal health checks
	setInterval(checkHealth, 500);

	// Termination handlers
	procSignals.forEach(sig => process.on(sig, onTerminate) );
}

function checkHealth() {
	if(terminating) return;
	else if(!requester) return lastActivity = Date.now();
	else if((Date.now() - lastActivity) >= config.INACTIVITY_TIMEOUT){
		// Reset clock
		lastActivity = Date.now();

		console.error(`WARNING: No heartbeat from the broker for ${config.INACTIVITY_TIMEOUT / 1000} seconds`);
		reconnect();
	}
}

// REQUEST

function sendRequest(requestPayload){
	if(typeof requestPayload != 'object')
		throw new Error("The parameter must be a payload object");

	requester.send(JSON.stringify(requestPayload));
}

// RESPONSE

function gotResponse() {
	lastActivity = Date.now();
}

// Lifecycle

function connect(uri){
	if(terminating) return;

	if(!initialized) {
		if(!uri || typeof uri != "string" || !uri.length)
			throw new Error('[TinyZMQ] ERROR: expected the broker URI to connect the client to');
		else
			brokerURI = uri;
	}
	else {
		if(uri == brokerURI || !uri || typeof uri != 'string' || !uri.length)
			return console.log('[TinyZMQ] WARNING: Connection already established to the broker');
		else if(requester) {
			requester.close(brokerURI);
			console.log('[TinyZMQ] WARNING: Connecting to another broker URI. Closing the previous connection.');
		}

		brokerURI = uri;
	}

	init();

	// CONNECT TO THE BROKER
	requester = zmq.socket('req');
	requester.on('message', gotResponse);

	if(config.DEBUG) {
		// Register to monitoring events
		requester.on('connect', function(fd, ep) {console.log('[TinyZMQ] Connect');});
		requester.on('connect_delay', function(fd, ep) {console.log('[TinyZMQ] Connect delay');});
		requester.on('connect_retry', function(fd, ep) {console.log('[TinyZMQ] Connect retry');});
		requester.on('listen', function(fd, ep) {console.log('[TinyZMQ] Listen');});
		requester.on('bind_error', function(fd, ep) {console.log('[TinyZMQ] Bind error');});
		requester.on('accept', function(fd, ep) {console.log('[TinyZMQ] Accept');});
		requester.on('accept_error', function(fd, ep) {console.log('[TinyZMQ] Accept_error');});
		requester.on('close', function(fd, ep) {console.log('[TinyZMQ] Close');});
		requester.on('close_error', function(fd, ep) {console.log('[TinyZMQ] Close_error');});
		requester.on('disconnect', function(fd, ep) {console.log('[TinyZMQ] WARNING: Disconnected');});

		// Handle monitor error
		requester.on('monitor_error', function(err) {
			console.log('[TinyZMQ] WARNING: Error in monitoring: %s, will restart monitoring in .5 seconds', err);
			setTimeout(function() { requester.monitor(500, 0); }, 500);
		});

		requester.monitor(500, 0);
	}

	// READY
	requester.connect(brokerURI);

	// return the method to call us to the client
	return sendRequest;
}

function reconnect(){
	if(terminating) return;

	console.error("[TinyZMQ] Trying to reconnect...");
	requester.disconnect(brokerURI);
	requester.close(brokerURI);

	setTimeout(function(){
		// CONNECT TO THE BROKER
		requester = zmq.socket('req');
		requester.on('message', gotResponse);

		if(config.DEBUG) {
			// Register to monitoring events
			requester.on('connect', function(fd, ep) {console.log('[TinyZMQ] Connect');});
			requester.on('connect_delay', function(fd, ep) {console.log('[TinyZMQ] Connect delay');});
			requester.on('connect_retry', function(fd, ep) {console.log('[TinyZMQ] Connect retry');});
			requester.on('listen', function(fd, ep) {console.log('[TinyZMQ] Listen');});
			requester.on('bind_error', function(fd, ep) {console.log('[TinyZMQ] Bind error');});
			requester.on('accept', function(fd, ep) {console.log('[TinyZMQ] Accept');});
			requester.on('accept_error', function(fd, ep) {console.log('[TinyZMQ] Accept_error');});
			requester.on('close', function(fd, ep) {console.log('[TinyZMQ] Close');});
			requester.on('close_error', function(fd, ep) {console.log('[TinyZMQ] Close_error');});
			requester.on('disconnect', function(fd, ep) {console.log('[TinyZMQ] WARNING: Disconnected');});

			// Handle monitor error
			requester.on('monitor_error', function(err) {
				console.log('[TinyZMQ] WARNING: Error in monitoring: %s, will restart monitoring in .5 seconds', err);
				setTimeout(function() { requester.monitor(500, 0); }, 500);
			});

			requester.monitor(500, 0);
		}

		// READY
		requester.connect(brokerURI);
	}, 50);
}

function onTerminate(code){
	console.log("\n[TinyZMQ] The process is terminating", code || '');

	terminating = true;
	if(requester) {
		try {
			requester.disconnect(brokerURI);
			requester.close(brokerURI);
		}
		catch(e){ ; }
	}
	process.exit(0);
}

module.exports = {
	connect  // this function executed will return the sendRequest(payload, callback) function
};
