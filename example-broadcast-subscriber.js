const worker = require('.').broadcast.subscriber;

worker.connect(`tcp://${process.env.BROKER_IP || 'localhost'}:5560`, function(payload){
	console.log("THE SUBSCRIBER GOT", payload);

	// HANDLE DATA

});
