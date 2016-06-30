var rabbitPromise = require('../queue/rabbit'), 
	config = require('../config');

var gcm = require('node-gcm');
var interval = 0;
rabbitPromise.done(function(rabbit) {
    rabbit.queue('gcm_push', {autoDelete: false}, function(q){
        q.bind(config.rabbitMQ.exchange, 'gcm_push');
        q.subscribe(function(message, headers, deliveryInfo, messageObject){
        	setTimeout(function(){
        		console.log(message);
        		console.log(headers);
        		console.log(deliveryInfo);
        		console.log("================================");
        		var message = new gcm.Message({
        			collapseKey: 'demo2',
        			delayWhileIdle: true,
        			timeToLive: 3,
        			data: {
        				title: 'Dongne GCM demo',
        				message: 'Google Cloud Messaging 테스트',
        				custom_key1: 'custom data1',
        				custom_key2: 'custom data2'
        			}
        		});

        		var server_api_key = "AIzaSyBMjOPg1TvJd6r-rWfi56qWkB3LOpvtXbo";
        		var sender = new gcm.Sender(server_api_key);
        		var registrationIds = [];
//        		var token = 'Android 디바이스에서 Instance ID의 token';
        		var token = 'e_rhdaWHuWI:APA91bEiH0zxf36zdJsQrqvBB9PHcSTsp6Tem2pDtes8921vvg_l66VSv294lr4vS5Ziv331aJjSrK3k79LAnjUhGP_-e7_c6Ux-TN89gUu5soYk_AJVZGgj8jW2SkSGDlMhVV2CpuHX';
        		var token2 = 'dhh6IfcRKV4:APA91bFVs1JnZrb0Ly7c4URUYZF92J4lgZAkMaw3RALOqIrE_9eGNOdVEAgz5SnkQArKXFHAQB5QYSeJw0JCTNy7qnLami0K0THwKMiBXu93-TwRQSwSWxSoETKuTCG-58lI_J0kbE-0';
        		var tokenS4 = 'APA91bH_rIwQAgNlym1h9mDeJgl2-drzAnwG0OqRTIL0qWaILdgMW0uVCYiuerUGa0hXScBlQ_2HoUqNGe4xHDdubEynAIi8y91cL35UyGg_v3OapRcO0Ga3w7S5vldDJ80nw3y-Iz8p';
        		var tokenNote3 = 'APA91bERVV5lQwTUpJVEw66qsHuff_N_eGO0Bm6pYfesIzKYzdw65_RrT4Tic4yF21wtmxbhAdm5E9GibBQLE9aBV5wsVfV2EkOE2gXyEQ90fKfWTRWFezAVV339P1fZfXolQGn1uvxX';
//        		token, token2 는 Ansr 테스트 푸시용
        		//s4, note3 는 gcmchat 테슽용
        		//registrationIds.push(token);
        		//registrationIds.push(token2);
        		registrationIds.push(tokenS4);
        		registrationIds.push(tokenNote3);
        		sender.send(message, registrationIds, 4, function (err, result) {
        			//result{ success., failure., canonical_ids, results:[{message_id:,}]}
        			console.log("sender.result:", result);
        			ex.publish(deliveryInfo.replyTo, {message: 'done'}, {headers: headers});
        		});
//		            ex.publish(deliveryInfo.replyTo, {message: 'done'}, {headers: headers});
        	}, interval);
        });
    });
});