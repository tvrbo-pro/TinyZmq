const worker = require('tiny-zmq').worker;

worker.connect('tcp://localhost:5560', function(parameters, doneCallback){
	console.log("THE WORKER GOT", parameters);
	
	const result = doProcessing(parameters);
	doneCallback(result);
});

function doProcessing(parameters){
	parameters.value = Math.random(); // just appends a random number
	return parameters;
}
