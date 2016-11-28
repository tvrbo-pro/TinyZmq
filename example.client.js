const client = require('tiny-zmq').client;

const sendRequest = client.connect('tcp://localhost:5559');

sendRequest({ number: 1234 }, function(response){
	console.log("THE CLIENT GOT BACK:", response);
});
