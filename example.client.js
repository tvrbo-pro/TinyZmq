const client = require('.').client;

const sendRequest = client.connect(`tcp://${process.env.BROKER_IP || 'localhost'}:5559`);

sendRequest({ number: 1234 }, function(response){
	console.log("THE CLIENT GOT BACK:", response);
});
