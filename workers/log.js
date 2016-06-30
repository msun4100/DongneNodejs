var rabbitPromise = require('../queue/rabbit'), 
	config = require('../config');

rabbitPromise.done(function(rabbit) {
//	message: {method: req.method, url: req.url, ts: Date.now()}
	rabbit.queue('debug.log', {
		autoDelete : false
	}, function(q) {
		q.bind(config.rabbitMQ.exchange, '*.log');
		q.subscribe(function(message, headers, delivery) {
			console.log('Debug-Routing:' + delivery.routingKey
					+ JSON.stringify(message));
		});
	});

	rabbit.queue('error.log', {
		autoDelete : false
	}, function(q) {
		q.bind(config.rabbitMQ.exchange, 'error.log');
		q.subscribe(function(message, headers, delivery) {
			console.log('Error-Routing:' + delivery.routingKey
					+ JSON.stringify(message));
		});
	});
});
