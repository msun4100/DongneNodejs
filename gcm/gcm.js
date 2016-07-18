/*
'gcm.js' contains necessary functions required to interact with GCM server. 
 These functions basically makes a CURL request to GCM server by passing required parameters in order to invoke a push notification.
*/
var pool = require('../db_models/dbConfig'),
	Promise = require('bluebird'),
	async = require('async'),
	config = require('../config'),
	request = require('request');

var send = function(to, message){
	var fields = {
			to: to,
			data: message
	};
	return sendPushNotification(fields);
};

var sendToTopic = function(to, message){
	var fields = {
			to: '/topics/' + to,
			data: message
	};
	return sendPushNotification(fields);
};

var sendMultiple = function(registration_ids, message){
	var fields = {
			registration_ids: registration_ids,
			data: message
	};
	return sendPushNotification(fields);
};

var sendPushNotification = function(fields){
	console.log("fields:", fields);
	return new Promise(function (resolve, reject) {
		request({
			method : 'POST',
			uri : 'https://android.googleapis.com/gcm/send',
			headers : {
				'Content-Type' : 'application/json',
				'Authorization' : 'key='+ config.gcm.apiKey
			},
			body : JSON.stringify(fields)
//			body : JSON.stringify({
//				"registration_ids" : [ to_id ],
//				"data" : {
//					"msg" : msg,
//					"fromu" : fromu,
//					"name" : fromn
//				},
//				"time_to_live" : 108
//			})
		}, function(error, response, body) {
			if(error) reject(error);
//			console.log("gcm Error:", error);
//			console.log("gcm response:", response);
//			console.log("gcm body:", body);
			resolve(body);
//			callback({ 'response' : "Success" });
		});					
	});
};

module.exports = function () {
	
	return{
		send: send,
		sendToTopic: sendToTopic,
		sendMultiple: sendMultiple
	};
};