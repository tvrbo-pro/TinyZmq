const broker = require('.').balancing.broker;

broker.bind({
	clientsPort: 5559,
	workersPort: 5560
});
