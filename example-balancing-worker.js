const worker = require('.').balancing.worker;

worker.connect(`tcp://${process.env.BROKER_IP || 'localhost'}:5560`, function(parameters, doneCallback){
	console.log("THE WORKER GOT", parameters);

	doProcessing(parameters, function(result){
		console.log(" > THE WORKER REPLIES WITH", result);
		doneCallback(result);
	}, 100);
});

function doProcessing(parameters, callback){
	parameters.value = Math.random(); // just appends a random number
	callback(parameters);
}
