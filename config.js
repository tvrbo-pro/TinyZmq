// Example usage assuming HTTP_PORT is set in config-default.js or in config-production.js:
//
//   if API_HTTP_PORT is set as an environment variable, config.HTTP_PORT will take its value
//   else if HTTP_PORT is set as an environment variable, config.HTTP_PORT will take its value
//   else config.HTTP_PORT will take de value defined in config-default.js
//
// NOTE: Only keys defined in config-*.js will be used
//       Other environment variables will be ignored
//

const VAR_PREFIX = "TINY_ZMQ_";

// Base config
var config = require('./config-default.js');

if(process.env.NODE_ENV == 'production') {
	config.DEBUG = false;
}

// Environment variables will override default keys
Object.keys(config).forEach(key => {
	if(typeof process.env[VAR_PREFIX + key] != 'undefined') {
		console.log("[TinyZMQ] Using ENV variable", VAR_PREFIX + key);
		config[key] = process.env[VAR_PREFIX + key];
	}
	else if(typeof process.env[key] != 'undefined') {
		console.log("[TinyZMQ] Using ENV variable", key);
		config[key] = process.env[key];
	}
}, {});

module.exports = config;
