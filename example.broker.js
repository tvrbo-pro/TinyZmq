const broker = require('tiny-zmq').broker;
	
broker.bind({
	clientsPort: 5559,
	workersPort: 5560
});
