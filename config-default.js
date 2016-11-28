// These settings will be used unless NODE_ENV='production'
// and no setting in config-production.js overrides them

module.exports = {
	DEBUG: true,
	COMPONENT_NAME: 'TWINS LIB',

	PING_BASE_INTERVAL: 500,
	INACTIVITY_TIMEOUT: 5000,

	MATCHER_CLIENT_PORT: 5559,
	MATCHER_WORKER_PORT: 5560,
	MATCHER_CLIENT_URI: 'tcp://localhost:5559',
	MATCHER_WORKER_URI: 'tcp://localhost:5560',

	// Cluster aware
	API_INSTANCES: 2,
	MATCHER_INSTANCES: 4
};
