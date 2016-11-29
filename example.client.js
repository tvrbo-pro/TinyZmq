const client = require('.').client;

const sendRequest = client.connect(`tcp://${process.env.BROKER_IP || 'localhost'}:5559`);

var i = 0;
setInterval(function(){
	var request = { number: ++i };

	console.log("CLIENT REQUESTS", request);

	sendRequest(request, function(response){
		console.log(" > THE CLIENT GOT BACK:", response);
	});
}, 2000);
