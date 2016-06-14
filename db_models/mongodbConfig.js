//binding mongoose module
var mongoose = require('mongoose'),
	config = require('../config');
//connection uri
var dbURI = 'mongodb://'+ config.mongodb.url + '/' + config.mongodb.name;
//var dbURI = 'mongodb://'+ config.mongodbUrl + '/comments';
//get the database connection pool
mongoose.connect(dbURI,{server: { poolSize: 1 }});
//mongoose.connect(dbURI);
var conn = mongoose.connection;	
//DB Connection Events
//Failed to connect database
//mongoose.connection.on('error', function(err) {
conn.on('error', function(err) {
	console.log("Failed to get connection in mongoose, err is " + err );
});

//Succeed to connect database
conn.on('connected', function() {
	console.log('Succeed to get connection pool in mongoose, dbURI is ' + dbURI );
		
});
	
//when the connection has disconnected
conn.on('disconnected', function() {
	console.log('Database connection has disconnected.');
});
	
//If the Node.js process is going down, close database
process.on('SIGINT', function() {
	mongoose.connection.close(function() {
		console.log('Application process is going down, disconnect database connection...');
		process.exit(0);
	});
});
//for numbering Schema column

module.exports = conn;

//		exports connect function to app.js --> require('./mongodbConfig.js').connect(); 처럼 사용
//exports.connect = function() {
//	
//	//get the database connection pool
//	mongoose.connect(dbURI);
//	
//	//DB Connection Events
//	//Succeed to connect database
//	mongoose.connection.on('connected', function() {
//		console.log('Succeed to get connection pool in mongoose, dbURI is ' + dbURI );
//		var conn = mongoose.connection;
//		module.exports = conn;
//	});
//	
//	//Failed to connect database
//	mongoose.connection.on('error', function(err) {
//		console.log("Failed to get connection in mongoose, err is " + err );
//	});
//	
//	//when the connection has disconnected
//	mongoose.connection.on('disconnected', function() {
//		console.log('Database connection has disconnected.');
//	});
//	
//	//If the Node.js process is going down, close databse
//	//connection pool
//	process.on('SIGINT', function() {
//		mongoose.connection.close(function() {
//			console.log('Application process is going down, disconnect database connection...');
//			process.exit(0);
//		});
//	});
////	return mongoose.connection;
//};