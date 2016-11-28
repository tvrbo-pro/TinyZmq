TinyZMQ
----
Tiny ZMQ is an NodeJS package that provides simple load balanced messaging on distributed environments

## Installation

Install it from NPM

	npm i -S tiny-zmq
	
**Note**: You need to have `libzmq` installed in your computer in order to install the dependencies (zmq). 


## Broker
Create a component that acts as the broker:

	const broker = require('tiny-zmq').broker;
	
	broker.bind({
		clientsPort: 5559,
		workersPort: 5560
	});

## Worker
To register a worker, add this code to the component accepting work requests:

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

## Client
To register a client, add this code to the component that places requests:

	const client = require('tiny-zmq').client;
	
	const sendRequest = client.connect('tcp://localhost:5559');

	sendRequest({ number: 1234 }, function(response){
		console.log("THE CLIENT GOT BACK:", response);
	});

## Utilities

To get an example of a container running the broker, worker or client on a Linux + NodeJS + ZMQ environment, refer to the ```Dockerfile```.

## Related

* [ZMQ official documentation](http://zguide.zeromq.org/page:all)
* [ZMQ for NodeJS](https://github.com/JustinTulloss/zeromq.node)

---

```by Jordi Moraleda - Tvrbo```
