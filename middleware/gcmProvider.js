var exchange = require('../queue');

var gcm = require('node-gcm'), 
	config = require('../config');
//exchange는 config.rabbitMQ로 생성된 익스체인지에 대한 레퍼런스로 promise를 리졸브할 것
//done()함수는 연결이되면 실행되거나 연결되어 있으면 바로 실행됨. 
//연결이 끊기는 이슈는 프로미스객체기 때문에 예외처리 가능

function push(message) {
	exchange.done(function(ex){
		ex.publish('gcm_push', message);
	});
}
exports.gcmPush = function gcmPush(req, res, next, cb){
	exchange.done(function(ex){
		
		
		
	});
};


exports.push = push;