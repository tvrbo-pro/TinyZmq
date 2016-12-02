const balancingBroker = require('./balancing.broker.js');
const balancingClient = require('./balancing.client.js');
const balancingWorker = require('./balancing.worker.js');

const broadcastBroker = require('./broadcast.broker.js');
const broadcastClient = require('./broadcast.client.js');
const broadcastSubscriber = require('./broadcast.subscriber.js');

module.exports = {
	balancing: {
		broker: balancingBroker,
		client: balancingClient,
		worker: balancingWorker
	},
	broadcast: {
		broker: broadcastBroker,
		client: broadcastClient,
		subscriber: broadcastSubscriber
	}
};
