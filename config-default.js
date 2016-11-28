// These settings will be used unless NODE_ENV='production'
// and no setting in config-production.js overrides them

module.exports = {
	DEBUG: true,

	PING_BASE_INTERVAL: 500,
	INACTIVITY_TIMEOUT: 5000,

	// Cluster aware
	CLIENT_INSTANCES: 2,
	WORKER_INSTANCES: 4
};
