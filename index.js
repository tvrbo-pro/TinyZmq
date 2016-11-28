const balancingBroker = require('./balancing.broker.js');
const balancingClient = require('./balancing.client.js');
const balancingWorker = require('./balancing.worker.js');

module.exports = {
	client: balancingClient,
	worker: balancingWorker,
	broker: balancingBroker
};
