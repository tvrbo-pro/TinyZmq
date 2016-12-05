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
var workerCallbacks = [];

function init() {
	if(initialized) return;
	initialized = true;

	// Internal health checks
	setInterval(checkHealth, 500);
	setInterval(pingMatchers, PING_INTERVAL);
	setInterval(cleanExpiredCallbacks, 20000);

	// Termination handlers
	procSignals.forEach(sig => process.on(sig, onTerminate) );
}

function pingMatchers(){
	if(terminating) return;
	else if(!requester) return;
	requester.send('ping');
}

function checkHealth() {
	if(terminating) return;
	else if(!requester) return lastActivity = Date.now();
	else if((Date.now() - lastActivity) >= config.INACTIVITY_TIMEOUT){
		// Reset clock
		lastActivity = Date.now();

		console.error(`WARNING: No heartbeat from workers for ${config.INACTIVITY_TIMEOUT / 1000} seconds`);
		reconnect();
	}
}

function cleanExpiredCallbacks(){
	for(let i = 0; i < workerCallbacks.length; i++){
		if(workerCallbacks[i].expire >= Date.now()) continue;

		// Notify timeout to the caller
		workerCallbacks[i].callback({ result: 'timeout' });
		workerCallbacks.splice(i, 1);
		i--;
	}
}

// REQUEST

function sendRequest(parameters, callback){
	if(typeof parameters != 'object')
		throw new Error("The first parameter must be a payload object");
	else if(typeof callback != 'function')
		throw new Error("The second parameter must be a callback function");

	let newId = uuid();
	const requestPayload = {
		id: newId,
		parameters
	};

	workerCallbacks.push({
		id: newId,
		callback: callback,
		expire: Date.now() + 1000 * 10 // +10 seconds
	});

	requester.send(JSON.stringify(requestPayload));
}

// RESPONSE

function gotResponse(responseBuffer) {
	lastActivity = Date.now();
	if(!responseBuffer)
		return console.error('ERROR: Empty responseBuffer from worker');
	else if(responseBuffer.length == 4 && responseBuffer.toString() == 'pong')
		return; // done

	try {
		responseParameters = JSON.parse(responseBuffer);
		if(!responseParameters.id) {
			console.error('ERROR: Response from the worker is missing Request ID', responseParameters);
		}

		for(let i = 0; i < workerCallbacks.length; i++){
			if(workerCallbacks[i].id != responseParameters.id) continue;

			// notify and clean
			workerCallbacks[i].callback(responseParameters.response);
			workerCallbacks.splice(i, 1);
			break;
		}
	}
	catch(err) {
		console.error("Matcher response handling Error:", err.message || err);
	}
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
