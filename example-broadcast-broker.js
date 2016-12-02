const broker = require('.').broadcast.broker;

broker.bind({
	clientsPort: 5559,
	subscribersPort: 5560
});
