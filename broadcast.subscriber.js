const zmq = require('zmq');
const config = require('./config.js');
const procSignals = ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGTERM'/*, 'SIGUSR2'*/];

// STATE

var brokerURI;
var subscriber;
var initialized = false;
var terminating = false;
var notifySubscriber;
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
	else if(!subscriber) return lastActivity = Date.now();
	else if((Date.now() - lastActivity) >= config.INACTIVITY_TIMEOUT) {
		// Reset clock
		lastActivity = Date.now();

		console.error(`[TinyZMQ] WARNING: No heartbeat from clients for ${config.INACTIVITY_TIMEOUT / 1000} seconds`);
		reconnect();
	}
}

// MESSAGE HANDLER
function onRequest(notificationBuffer) {
	let notificationPayload;
	lastActivity = Date.now();
	if(notificationBuffer.length == 4 && notificationBuffer.toString() == 'ping') return subscriber.send('pong'); // done
	else if(!notifySubscriber) return console.error('ERROR: No worker callback is registered. Ignoring notification.');

	try {
		notificationPayload = JSON.parse(notificationBuffer.toString());
	}
	catch(err) {
		console.error("[TinyZMQ] Got an invalid notification: ", notificationBuffer.toString());
		subscriber.send(JSON.stringify({error: true, message: "Unable to parse the payload"}));
		return;
	}

	// NOTIFY
	notifySubscriber(notificationPayload);
	// DONE
	subscriber.send('');
}

// Lifecycle

function connect(uri, subscriberCallback){
	if(terminating) return;
	else if(!initialized) {
		if(!uri || typeof uri != "string" || !uri.length)
			throw new Error('[TinyZMQ] ERROR: expected the broker URI to connect the worker to');
		else if(!subscriberCallback || typeof subscriberCallback != 'function')
			throw new Error('[TinyZMQ] ERROR: expected a callback function to notify the worker');

		brokerURI = uri;
		notifySubscriber = subscriberCallback;
	}
	else { // already on
		if(uri == brokerURI) { // no need to connect
			if(typeof subscriberCallback == 'function')
				notifySubscriber = subscriberCallback;
			else
				console.log('[TinyZMQ] WARNING: Connection already established to the broker');
			return;
		}
		else if(!uri || typeof uri != "string" || !uri.length)
			throw new Error('[TinyZMQ] ERROR: expected the broker URI to connect the worker to');
		else if(subscriber) {
			console.log('[TinyZMQ] WARNING: Connecting to another broker URI. Closing the previous connection.');
			subscriber.close();
			brokerURI = uri;
		}

		if(typeof subscriberCallback == 'function')
			notifySubscriber = subscriberCallback;
	}

	// INITIALIZE
	init();

	// CONNECT TO THE BROKER
	subscriber = zmq.socket('sub');
	subscriber.subscribe('');
	subscriber.on('message', onRequest);

	if(config.DEBUG) {
		// Register to monitoring events
		subscriber.on('connect', function(fd, ep) {console.log('[TinyZMQ] Connect');});
		subscriber.on('connect_delay', function(fd, ep) {console.log('[TinyZMQ] Connect delay');});
		subscriber.on('connect_retry', function(fd, ep) {console.log('[TinyZMQ] Connect retry');});
		subscriber.on('listen', function(fd, ep) {console.log('[TinyZMQ] Listen');});
		subscriber.on('bind_error', function(fd, ep) {console.log('[TinyZMQ] Bind error');});
		subscriber.on('accept', function(fd, ep) {console.log('[TinyZMQ] Accept');});
		subscriber.on('accept_error', function(fd, ep) {console.log('[TinyZMQ] Accept_error');});
		subscriber.on('close', function(fd, ep) {console.log('[TinyZMQ] Close');});
		subscriber.on('close_error', function(fd, ep) {console.log('[TinyZMQ] Close_error');});
		subscriber.on('disconnect', function(fd, ep) {console.log('[TinyZMQ] WARNING: Disconnected');});

		// Handle monitor error
		subscriber.on('monitor_error', function(err) {
			console.log('[TinyZMQ] WARNING: Error in monitoring: %s, will restart monitoring in .5 seconds', err);
			setTimeout(function() { subscriber.monitor(500, 0); }, 500);
		});

		subscriber.monitor(500, 0);
	}

	// READY
	subscriber.connect(brokerURI);
}

function reconnect(){
	if(terminating) return;

	console.error("[TinyZMQ] Trying to reconnect...");
	subscriber.close();

	setTimeout(function(){
		// CONNECT TO THE BROKER
		subscriber = zmq.socket('sub');
		subscriber.subscribe('');
		subscriber.on('message', onRequest);

		if(config.DEBUG) {
			// Register to monitoring events
			subscriber.on('connect', function(fd, ep) {console.log('[TinyZMQ] Connect');});
			subscriber.on('connect_delay', function(fd, ep) {console.log('[TinyZMQ] Connect delay');});
			subscriber.on('connect_retry', function(fd, ep) {console.log('[TinyZMQ] Connect retry');});
			subscriber.on('listen', function(fd, ep) {console.log('[TinyZMQ] Listen');});
			subscriber.on('bind_error', function(fd, ep) {console.log('[TinyZMQ] Bind error');});
			subscriber.on('accept', function(fd, ep) {console.log('[TinyZMQ] Accept');});
			subscriber.on('accept_error', function(fd, ep) {console.log('[TinyZMQ] Accept_error');});
			subscriber.on('close', function(fd, ep) {console.log('[TinyZMQ] Close');});
			subscriber.on('close_error', function(fd, ep) {console.log('[TinyZMQ] Close_error');});
			subscriber.on('disconnect', function(fd, ep) {console.log('[TinyZMQ] WARNING: Disconnected');});

			// Handle monitor error
			subscriber.on('monitor_error', function(err) {
				console.log('[TinyZMQ] WARNING: Error in monitoring: %s, will restart monitoring in .5 seconds', err);
				setTimeout(function() { subscriber.monitor(500, 0); }, 500);
			});

			subscriber.monitor(500, 0);
		}

		// READY
		subscriber.connect(brokerURI);
	}, 50);
}

function onTerminate(code){
	console.log("\n[TinyZMQ] The process is terminating", code || '');

	terminating = true;
	if(subscriber) {
		try {
			// subscriber.disconnect(config.MATCHER_WORKER_URI);
			subscriber.close(config.MATCHER_WORKER_URI);
		}
		catch(e){ ; }
	}
	process.exit(0);
}

module.exports = {
	connect // this function gets the callback to execute when a matching notification is received
};
