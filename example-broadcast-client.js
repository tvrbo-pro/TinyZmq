const client = require('.').broadcast.client;

const sendRequest = client.connect(`tcp://${process.env.BROKER_IP || 'localhost'}:5559`);

var i = 0;
setInterval(function(){
	var request = { number: ++i, pid: process.pid };

	console.log("CLIENT NOTIFIES", request);

	sendRequest(request);
}, 2000);
