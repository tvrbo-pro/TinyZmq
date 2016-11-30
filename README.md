TinyZMQ
----
Tiny ZMQ is an NodeJS package that provides simple, load balanced and resilient messaging on distributed environments.

It implements the Client - Broker - Worker schema and takes care of reachability. The stock ZMQ implementation for NodeJS may run into issues if some of the workers get offline.

An example Docker container is also provided, for convenience.

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

## Parameterization

The internal behavior can be tuned by using environment variables at run time.

* ```TINY_ZMQ_DEBUG```: By default, disabled when ```NODE_ENV='production'``` and ```true``` otherwise. When set to true, provides extra logging information.
* ```TINY_ZMQ_PING_BASE_INTERVAL```: The client will periodically ping the worker to assert that it is still alive. By default, every ```500``` milliseconds.
* ```TINY_ZMQ_INACTIVITY_TIMEOUT```: After no pingback response from either the client or the worker, the connection will be retried again. By default, the timeout is ```5000``` milliseconds. 
* ```TINY_ZMQ_CLIENT_INSTANCES```: The number of client instances running on the environment. This helps to better adjust the actual rate of pings between nodes.
* ```TINY_ZMQ_WORKER_INSTANCES```: The number of worker instances running on the environment.

## Utilities

To get an example of a container running the broker, worker or client on a Linux + NodeJS + ZMQ environment, refer to the ```Dockerfile```.

To build a test image for each component, run the appropriate command from the project folder:

	docker build --build-arg target=broker -t img_broker .
	docker build --build-arg target=worker -t img_worker .
	docker build --build-arg target=client -t img_client .

Once the images are built, you can run them inside a container:

	docker run -it --name my_broker img_broker
	docker run -it --name my_worker img_worker
	docker run -it --name my_client img_client

**Note**: By default, the broker IP is assumed to be ```172.17.0.2```. To change it, add a build argument:

	docker build --build-arg target=worker --build-arg broker_ip=172.17.0.5 -t img_worker .
	
	docker build --build-arg target=client --build-arg broker_ip=172.17.0.5 -t img_client .

## Related

* [ZMQ official documentation](http://zguide.zeromq.org/page:all)
* [ZMQ for NodeJS](https://github.com/JustinTulloss/zeromq.node)
* [Node-ZMQ Docker image](https://hub.docker.com/r/tvrbo/node-zmq/)

---

```by Jordi Moraleda - Tvrbo```
