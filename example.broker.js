const broker = require('.').broker;
	
broker.bind({
	clientsPort: 5559,
	workersPort: 5560
});
