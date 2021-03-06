var express = require('express');
var router = express.Router();
var pool = require('../db_models/dbConfig');
var dbHandler = require('../db_models/dbHandler')();
var gcm = require('../gcm/gcm')();
var Push = require('../gcm/push');
var TimeStamp = require('../gcm/timeStamp');
var config = require('../config');
var async = require('async');
var request = require('request');
var mUtil = require('../middleware/utilities');

var ChatRoomUser = require('../db_models/chatRoomUser');

router.post('/user/login', function (req, res, next) {
	/* 
	 * User login or registration
	 * params: name, email
	*/
	console.log("inner /user/login func");
	var name = req.body.name;
	var email = req.body.email;
	var user_id = -1;
	var univId = req.body.univId;	//android login시
	if (univId === null || univId === "" || univId === undefined) {
		console.log("/user/login univId error");
		univId = 0;
	}
	dbHandler.createUser(user_id, name, email, univId)
		.then(function (datas) {
			res.send(datas);
		}, function (error) {
			//chat은 response type이 다르기 때문에 next사용해서 에러 미들웨어로 보내면 에러 생길 듯, 대신 console로 로그 출력해서 확인
			//나중에 컨피그 파일에 에러메시지 다 정해서 입력해서 컨피그 파일로 대체하고 에러 발생시 래빗큐로 로그 찍도록 수정
			console.log(error);
			res.send({
				error: true,
				message: "Oops! An error occurred while registereing"
			});
		}).finally(function () {
			//		console.log('finally functions');
		});
});

router.put('/user/:id', function (req, res, next) {
	/* 
	 * Updates user’s gcm registration id in database
	 * params: gcm_registration_id
	*/
	var user_id = req.params.id;
	var regId = req.body.gcm_registration_id;
	dbHandler.updateGcmID(user_id, regId)
		.then(function (datas) {
			//		console.log("datas:", datas);
			res.send(datas);
		}, function (error) {
			console.log('updateGcmID Error:', error);
			res.send({
				error: true,
				message: "Failed to update GCM registration ID"
			});
		});

});
//used at GcmChatFragment
router.get('/chat_rooms', function (req, res, next) {
	/* 
	 * Fetches all chat rooms
	 * params: -
	 * 
	 * var datas = {
		error: false,
		chat_rooms: rooms };
	*/

	dbHandler.getAllChatRooms()
		.then(function (datas) {
			res.send(datas);
		}, function (error) {
			console.log('getAllChatRooms Error:', error);
			res.send({
				error: true,
				message: "Failed to getAllChatRooms"
			});
		});
});
//mongodb version
router.post('/chat_rooms', function (req, res, next) {
	var userId = req.body.userId;
	var query = ChatRoomUser.find({ "users": userId });
	//	query.and([{from: reqFriend},{to: user.userId }]);
	//	query.where({});
	query.select({ __v: 0 });
	query.sort({ updatedAt: 1 });
	query.exec().then(function (docs) {
		var roomList = [];
		var i, j;
		if (docs.length > 0) {
			for (i = 0; i < docs.length; i++) {
				roomList.push(docs[i].chat_room_id);
			}
			dbHandler.getChatRoomsLastMsg(roomList)
				.then(function (rooms) {
					for (i = 0; i < docs.length; i++) {
						for (j = 0; j < rooms.length; j++) {
							if (docs[i].chat_room_id === rooms[j].chat_room_id) {
								// rooms[j].users = [];
								rooms[j].users = docs[i].users;	//원래 그냥 이렇게 대입하면 안됐었는데
								rooms[j].host = docs[i].host;
								break;
							}
						}
					}
					// console.log("/chat_rooms", rooms);				
					res.send({ error: false, message: 'chat lists', chat_rooms: rooms });
				}, function (error) {
					res.send({ error: true, message: 'getChatRoomLastMsg query error' });
				});
		} else {
			res.send({ error: true, message: 'chat_room_list is null' });
		}
	}, function (error) {
		console.log('getChatRoomLastMsg Error:', error);
		res.send({
			error: true,
			message: "Failed to getChatRoomLastMsg"
		});
	});
});
router.post('/chat_rooms/chk', function (req, res, next) {
	var item;
	var users = [];
	console.log('req.body', req.body);
	for (var key in req.body) {
		if (req.body.hasOwnProperty(key)) {
			item = req.body[key];
			var sub = key.substring(0, 5);
			if (sub === "users") {
				users.push(parseInt(item));
			}
		}
	}
	if (users.length === 0) {
		return res.send({ error: true, message: "users length error" });
	}
	console.log('chk users', users);
	var query = ChatRoomUser.find({ "users": { "$in": users } });
	//	query.and([{from: reqFriend},{to: user.userId }]);
	//	query.where({});
	query.select({ __v: 0 });
	query.sort({ updatedAt: 1 });
	query.exec().then(function (docs) {
		var list = [];
		var i = 0, j = 0;
		var flag = false;
		if (docs.length > 0) {
			for (i = 0; i < docs.length; i++) {
				if (docs[i].users.length === users.length) {
					for (j = 0; j < users.length; j++) {
						flag = inArray(docs[i].users, users[j]);
						if (flag === false) { break; }
					}
				}
				if (flag === true) {
					list.push(docs[i]);
				}
				flag = false;
			}
			console.log("list", list);
			res.send({ error: false, message: 'find list ' + list.length, chat_rooms: list });
		} else {
			console.log("list", list);
			res.send({ error: false, message: 'Not found ' + list.length, chat_rooms: list });
		}
	}, function (error) {
		console.log('chatRoom/chk Error:', error);
		res.send({
			error: true,
			message: "Failed to get list"
		});
	});
});

var inArray = function (arr, value) {
	// Returns true if the passed value is found in the array. Returns false if it is not.
	var i;
	for (i = 0; i < arr.length; i++) {
		//		console.log("arr["+i+"]", arr[i]);
		if (arr[i] === value) {
			return true;
		}
	}
	return false;
};


//MySql version
//router.post('/chat_rooms', [mUtil.requireAuthentication], function(req, res, next){
//	/* 
//	 * Fetches request chat roomList
//	 * params: roomList
//	*/
//	var item;
//	var roomList = [];
//	for (var key in req.body) {
//		if (req.body.hasOwnProperty(key)) {
//			// key === user_id, room_name 등
//			item = req.body[key];
////			console.log(item);	
//			var sub = key.substring(0, 8);
//			if(sub === "roomList"){
//				roomList.push(item);
//			}
//		}
//	}
//	console.log("roomList: ", roomList);
//	if(roomList.length === 0){
//		return res.send({error: true, message: "roomList length error"});
//	}
//
//	dbHandler.getJoinedChatRooms(roomList)
//	.then(function (datas) {
//		res.send(datas);
//	},function (error) {
//		console.log('getJoinedChatRooms Error:', error);
//		res.send({
//			error:true, 
//			message:"Failed to getJoinedChatRooms"
//		});
//	});
//});

//used at GcmChatFragment
router.get('/chat_rooms/:id', function (req, res, next) {
	/* 
	 * Fetches single chat room messages
	 * params: replace :id with actual chat room id
	*/
	var chat_room_id = req.params.id;
	dbHandler.getChatRoomMsg(chat_room_id)
		.then(function (datas) {
			//		console.log("/chat_rooms/:id",datas);
			res.send(datas);
		}, function (error) {
			res.send({
				error: true,
				message: "Failed to getChatRoom Messages"
			});
		});
});
router.post('/chat_rooms/:id', function (req, res, next) {
	/* 
	 * Fetches single chat room messages
	 * params: replace :id with actual chat room id, body.joined_at
	*/
	var chat_room_id = req.params.id;
	var joined_at = req.body.joined_at;
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
	
	if (!joined_at || !chat_room_id) {
		return res.send({ error: true, message: 'timeStamp undefined error' });
	}
	console.log("chat_room/"+chat_room_id, req.body);
	console.log("chat_room/"+chat_room_id, ""+chat_room_id);
	if (start && display) {
		console.log("1111111111")
		dbHandler.getChatRoomMsgByTimeV2(chat_room_id, joined_at, start, display)
			.then(function (datas) {
				res.send(datas);
			}, function (error) {
				res.send({
					error: true,
					message: "Failed to getChatRoomMsgByTimeV2 Messages"
				});
			});
	} else {
		console.log("2222222222222")
		dbHandler.getChatRoomMsgByTime(chat_room_id, joined_at)
			.then(function (datas) {
				res.send(datas);
			}, function (error) {
				res.send({
					error: true,
					message: "Failed to getChatRoomMsgByTime Messages"
				});
			});
	}
});

router.post('/chat_rooms/:id/message', function (req, res, next) {
	/* 
	 * Posting a message in a chat room
	 * params: replace :id with actual chat room id
	*/
	var chat_room_id = req.params.id;
	var user_id = req.body.user_id;
	var message = req.body.message;

	//for requests
	var pushType = req.body.pushType;
	var to = req.body.to;	//addChatRoom으로 부터 오는 req.body.to (배열 변환되서 옴)
	if (!(to instanceof Array)) {
		to = [to];
	}
	console.log("to", to);
	//callback hell.. apply to 'async proccess'

	dbHandler.addMessage(user_id, chat_room_id, message)
		.then(function (datas) {
			//returned datas === { error: false, message: {Object of message}}
			//gcm push 하고 res.send.
			//개별적으로 처리해야되나? 아님 gcm push 성공 리턴시 send를 해야 하나?
			//gcm 성공 실패 여부와 상관없이 gcm.sendToTopic의 finally에서 res.send(datas) 해야 되나?
			//dbHandler에서 리턴된 data.message는  다시 messages 배열로 보내지고 또한 pushData로 푸시 보내기 위해 사용 됨
			var response = {
				error: datas.error,
				message: '',
				messages: [datas.message],	//okhttp model 위해서 위의 message객체를 배열로 바꿔 보내기 위해
				user: {}
			};
			dbHandler.getUser(user_id)
				.then(function (user) {
					//			datas.user = user;
					response.user = user;
					var pushData = {
						user: user,
						message: datas.message,
						chat_room_id: "" + chat_room_id
					};
					var flag = config.gcm.PUSH_FLAG_CHATROOM;
					if (pushType !== undefined) {
						flag = pushType;
					}
					var push = new Push("Dongne push msg...", pushData, false, flag);
					// console.log("push", push);
					if (pushType) {	//addChatRoom에서 요청한 푸시면
						console.log("pushType", "" + pushType);
						request({
							method: 'POST',
							uri: config.host + '/users/message',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								user_id: user_id,
								message: message,
								message_id: datas.message.message_id,
								chat_room_id: chat_room_id,
								pushType: pushType,
								to: to
							})
						}, function (error, resp, body) {
							//resp === 푸시 요청 response
							//response === 위에서 addMessage에 대한 response
							//body가 sendMultiple에 대한 response로 error: ture/false 여부로 성공실패 구분하면 됨
							if (error) {
								console.log("error:", error);
								return res.send({ error: true, message: 'gcm push error occuerred' });
							}
							// console.log("111error", error);
							// console.log("222resp", resp);
							// console.log("333body", body); //요청이 성공하면 body:{error:false, user:{to_user obj}} 가 리턴 됨
							var temp = JSON.parse(body);
							if (temp.error === true) {
								console.log("temp.error true")
								response.error = true;
								response.message = 'sendMultiple body error'
							}
							res.setHeader('content-type', 'application/json; charset=utf-8');
							res.send(response);
						});		//request
					} else {
						gcm.sendToTopic('topic_' + chat_room_id, push)
							.then(function (body) {
								// https://developers.google.com/cloud-messaging/topic-messaging				
								// Success example:{ "message_id": "10" } <- JSON.parse해야함 
								// failure example:{"error": "TopicsMessageRateExceeded"}
								var temp = JSON.parse(body);
								if (temp.message_id) {
									console.log('parse body' + body);
									response.message = temp.message_id;
								} else if (temp.error) {
									response.error = true;
									response.message = 'sendToTopic response error' + temp.error
								}
							}, function (error) {
								console.log('gcm error:', error);
								response.error = true;
								response.message = 'sendToTopic reject error'
							}).finally(function () {
								//addMessage의 결과를 response함. gcm.sendToTopic의 결과는 console로만 출력해서 확인--> 에러나는 경우 래빗큐로 에러로그에 저장?
								res.send(response);
							});
					}//else
				}, function (error) {	//getUser's Error function
					res.send({
						error: true,
						message: "Failed to getUser info"
					});
				});
		}, function (error) {	//addMessage Error function
			res.send({
				error: true,
				message: "Failed to addMessage"
			});
		}).finally(function () {

		});
});

router.post('/users/:id/message', function (req, res, next) {
	/* 
	 * Sending a message to user
	 * params: replace :id with actual user id
	*/
	var from_user_id = req.body.user_id;
	var message = req.body.message;
	var to_user_id = req.params.id;

	var reqDate = req.body.reqDate;
	if (reqDate === undefined) {
		reqDate = TimeStamp.getCurrentTimeStamp();
	}
	//기존에 없던 message_id와 chat_room_id 바디변수를 추가했으므로 
	//	기존 코드에 대한 요청이 정상작동하도록 undefined에 대한 처리를 해줌
	var message_id = req.body.message_id;
	var chat_room_id = req.body.chat_room_id;
	var flag = req.body.pushType;
	if (message_id === undefined) {
		message_id = '';
	}
	if (chat_room_id === undefined) {
		chat_room_id = '';
	}
	if (flag === undefined) {
		flag = config.gcm.PUSH_FLAG_USER;
	}
	var response = { error: false, message: '', user: {} };
	async.series([task1, task2], function (err, results) {
		//results[0] == from_user, results[1] == to_user  
		if (err) {
			res.send({ error: true, message: "Failed to async.series" });
			return;
		}
		var from_user = results[0],
			to_user = results[1];
		//		console.log("from_user", from_user);
		//		console.log("to_user", to_user);
		var msg = {
			message: message,
			message_id: message_id,
			chat_room_id: chat_room_id,
			created_at: reqDate
		};
		//익명처리
		if (flag === config.gcm.PUSH_FLAG_NOTIFICATION && message_id === 3) {
			from_user.name = "익 명";
		}
		var pushData = {
			user: from_user,
			chat_room_id: chat_room_id,
			message: msg,
			image: ''
		};
		var push = new Push("학교 사람들", pushData, false, flag);

		gcm.send(to_user.gcm_registration_id, push)
			.then(function (body) {
				var temp = JSON.parse(body);
				if (temp.failure > 0) {
					console.log("failure")
					response.error = true;
					response.message = 'gcm failure'
				} else {
					response.user = to_user;
				}
			}, function (error) { //send's reject
				console.log('gcm error:', error);
				response.error = true;
				response.message = 'gcm failure'
			}).finally(function () {
				res.setHeader('content-type', 'application/json; charset=utf-8');
				res.send(JSON.stringify(response));
			});

	});

	function task1(callback) {
		dbHandler.getUser(from_user_id)
			.then(function (user) {
				callback(null, user);
			}, function (error) {
				callback(error);
			});
	}
	function task2(callback) {
		dbHandler.getUser(to_user_id)
			.then(function (user) {
				callback(null, user);
			}, function (error) {
				callback(error);
			});
	}

});

router.post('/users/message', function (req, res, next) {
	/* 
	 * Sending a message to multiple users
	 * params: user_id, to, message `to` – param is user ids separated by comma (,)
	*/
	var user_id = req.body.user_id;
	var to_user_ids = req.body.to;
	var message = req.body.message;

	console.log("to_user_ids", to_user_ids);
	var message_id = req.body.message_id;
	var chat_room_id = req.body.chat_room_id;
	var flag = req.body.pushType;
	if (message_id === undefined) {
		message_id = '';
	}
	if (chat_room_id === undefined) {
		chat_room_id = '';
	}
	if (flag === undefined) {
		flag = config.gcm.PUSH_FLAG_USER;
	}
	var response = { error: false, message: '', user: {} };
	async.series([task1, task2], function (err, results) {
		//results[0] == from_user, results[1] == to_users list
		if (err) {
			res.send({ error: true, message: "Failed to async.series" });
			return;
		}
		var from_user = results[0],
			to_users = results[1];
		//		console.log('from_user:', from_user);
		//		console.log('to_users:', to_users);
		var registration_ids = [];
		var i;
		for (i = 0; i < to_users.length; i++) {
			registration_ids.push(to_users[i].gcm_registration_id);
		}
		//		console.log('regIds:', registration_ids);
		//		//===================
		var msg = {
			message: message,
			message_id: message_id,
			chat_room_id: chat_room_id,
			created_at: TimeStamp.getCurrentTimeStamp()
		};
		var pushData = {
			user: from_user,
			chat_room_id: chat_room_id,
			message: msg,
			image: ''
		};
		var push = new Push("Dongne push msg...", pushData, false, flag);

		gcm.sendMultiple(registration_ids, push)
			.then(function (body) {
				// console.log("sendMultiple success:", body);
				var temp = JSON.parse(body);
				if (temp.failure > 0) {
					response.error = true;
					response.message = 'sendMultiple failure';
					console.log("sendMultiple failure:", temp.failure);
				} else {
					response.error = false;
					response.message = 'sendMultiple success';
					response.user = from_user;
					console.log("sendMultiple success:", temp.success);
				}
			}, function (error) {
				//sendMultiple's reject
				// console.log("sendMultiple reject:", error);
				response.error = true;
				response.message = 'sendMultiple reject';
			}).finally(function () {
				res.setHeader('content-type', 'application/json; charset=utf-8');
				res.send(JSON.stringify(response));
			});
	});

	function task1(callback) {
		dbHandler.getUser(user_id)
			.then(function (user) {
				callback(null, user);
			}, function (error) {
				callback(error);
			});
	}
	function task2(callback) {
		dbHandler.getUsers(to_user_ids)
			.then(function (users) {
				callback(null, users);
			}, function (error) {
				callback(error);
			});
	}

});
router.post('/users/send_to_all', function (req, res, next) {
	/* 
	 * Sending a message to all the users subscribed to `global` topic
	 * params: user_id, message
	*/
	var user_id = req.body.user_id;
	var message = req.body.message;
	//	creating tmp message, skipping DB insertion
	dbHandler.getUser(user_id)
		.then(function (user) {
			var msg = {
				message: message,
				message_id: '',
				chat_room_id: '',
				created_at: TimeStamp.getCurrentTimeStamp()
			};
			var pushData = {
				user: user,
				message: msg,
				//				image: 'http://api.androidhive.info/gcm/panda.jpg'
				image: 'http://10.0.3.2:3000/images/getPic/1'
			};
			var push = new Push("Dongne push msg with image", pushData, false, config.gcm.PUSH_FLAG_USER);

			gcm.sendToTopic('global', push)
				.then(function (body) {
					console.log('gcm body:', body);
					res.send({
						error: false,
						user: user
					});
				}, function (error) {
					//sendToTopic's reject
					res.send({
						error: true,
						message: "Failed to 'global' sendToTopic"
					});
				});
		}, function (error) {	//getUser's Error function
			res.send({
				error: true,
				message: "Failed to getUser info"
			});
		});

});


router.post('/test/addChatRoom', function (req, res, next) {
	//	INSERT INTO `chat_rooms` (`chat_room_id`, `name`, `created_at`) VALUES (1, 'Material Design', '2016-01-06 06:57:40');
	//	var addMessage= function(user_id, chat_room_id, message){
	//	 fromUserId와 chatRoomId, message 파라미터 필요
	var room_name = req.body.room_name;
	var user_id = req.body.user_id;
	//	var to_user_ids = req.body.to;	//배열로 넘어옴.
	var to_user_ids = [];
	for (var key in req.body) {
		if (req.body.hasOwnProperty(key)) {
			// key === user_id, room_name 등
			item = req.body[key];
			//			console.log(item);	
			var sub = key.substring(0, 2);
			if (sub === "to") {
				to_user_ids.push(item);
			}
		}
	}
	console.log("to_user_ids: ", to_user_ids);
	if (to_user_ids.length === 0) {
		return res.send({ error: true, message: "to_user_ids length error" });
	}
	var message = req.body.message;

	var chat_room_id = req.body.chat_room_id;
	if (chat_room_id === "-1") {
		//디비에 채팅방이 없는 상태에서 요청된 첫번째 메시지인 경우
		console.log("chat_room_id === \"-1\"");
	}

	dbHandler.createChatRoom(room_name)
		.then(function (result) {
			//		var chat_room_id = req.params.id;
			//		var user_id = req.body.user_id;
			//		var message = req.body.message;
			//		/chat_rooms/:id/message
			var room_id = result.insertId;
			createMongoChatRoomUser(room_id, room_name, user_id, to_user_ids, function (err, result) {
				if (err) {
					//				여기서 에러 나면 MySQL 채팅방 삭제 해줘야 함
					return res.send({ error: true, message: "addChatRoom mongo error" });
				}
				//			createMongoChatRoomuser의 cb안에 아래 리퀘스트 요청을 묶어
				console.log("chatroomuser mongo result", result);
				request({
					method: 'POST',
					uri: config.host + '/chat_rooms/' + room_id + '/message',
					headers: {
						'Content-Type': 'application/json',
						//					'Authorization' : 'key='+ config.gcm.apiKey
					},
					body: JSON.stringify({
						user_id: user_id,
						message: message,
						pushType: config.gcm.PUSH_FLAG_NEW_ROOM,
						to: to_user_ids
					})
				}, function (error, response, body) {
					//				console.log("pushRes:", response);
					if (error) {
						console.log("error:", error);
						return res.send({ error: true, message: "addChatRoom request error" });
					}
					//				console.log("body:", body);
					res.setHeader('content-type', 'application/json; charset=utf-8');
					res.send(body);
				});		//request			

			});
		}, function (error) {
			console.log('addChatRoom Error:', error);
			res.send({
				error: true,
				message: "Failed to addChatRoom"
			});
		});
});

//push message만을 위한 url
router.post('/users/:id/push', function (req, res, next) {
	/* 
	 * Sending a message to user
	 * params: replace :id with actual user id
	*/
	var from_user_id = req.body.user_id;
	var message = req.body.message;
	var to_user_id = req.params.id;

	//기존에 없던 message_id와 chat_room_id 바디변수를 추가했으므로 
	//	기존 코드에 대한 요청이 정상작동하도록 undefined에 대한 처리를 해줌
	//이 url에서는 message_id와 chat_room_id는 필요 없음. 요청바디에 없어도 됨.
	var message_id = req.body.message_id;
	var chat_room_id = req.body.chat_room_id;

	var flag = req.body.pushType;
	var msgType = req.body.msgType;
	switch (msgType) {
		case "0":
			break;
		case "1":
			break;
		case "2":
			break;
		case "3":
			break;
		case "4":
			break;
		default:
			break;
	}

	if (message_id === undefined) {
		message_id = '';
	}
	if (chat_room_id === undefined) {
		chat_room_id = '';
	}
	if (flag === undefined) {
		flag = config.gcm.PUSH_FLAG_USER;
	}

	var response = { error: false, user: {} };
	async.series([task1, task2], function (err, results) {
		//results[0] == from_user, results[1] == to_user  
		if (err) {
			res.send({ error: true, message: "Failed to async.series" });
			return;
		}
		var from_user = results[0],
			to_user = results[1];
		//		console.log("from_user", from_user);
		//		console.log("to_user", to_user);
		var msg = {
			message: message,
			message_id: message_id,
			chat_room_id: chat_room_id,
			created_at: TimeStamp.getCurrentTimeStamp()
		};
		var pushData = {
			user: from_user,
			chat_room_id: chat_room_id,
			message: msg,
			image: ''
		};
		var push = new Push("학교 사람들", pushData, false, flag);

		gcm.send(to_user.gcm_registration_id, push)
			.then(function (body) {
				console.log('gcm body:', body);
				response.user = to_user;
			}, function (error) {
				//sendToTopic's reject
				console.log('gcm error:', error);
				response.error = true;
			}).finally(function () {
				res.setHeader('content-type', 'application/json; charset=utf-8');
				res.send(JSON.stringify(response));
			});
	});

	function task1(callback) {
		dbHandler.getUser(from_user_id)
			.then(function (user) {
				callback(null, user);
			}, function (error) {
				callback(error);
			});
	}
	function task2(callback) {
		dbHandler.getUser(to_user_id)
			.then(function (user) {
				callback(null, user);
			}, function (error) {
				callback(error);
			});
	}

});


function createMongoChatRoomUser(roomId, name, userId, users, cb) {
	users.push(userId);
	var info = { chat_room_id: roomId, name: name, host: userId, users: users };
	var chatRoomUser = new ChatRoomUser(info);

	chatRoomUser.save().then(function fulfilled(result) {
		cb(null, result);
	}, function rejected(err) {
		//"E11000 duplicate key error collection: dongne.users index: email_1 dup key: { : \"adduser@gmail.com\" }"
		console.log("cb func error:", err);
		err.code = 500;
		cb(err, null);
	});
}

//====test routes

router.get('/test/addMessage', function (req, res, next) {
	dbHandler.addMessage(35, 3, 'addmessageTest2222')
		.then(function (datas) {
			res.send(datas);
		}, function (error) {
			console.log('addMessage Error:', error);
			res.send({
				error: true,
				message: "Failed to addMessage info"
			});
		});
});
router.get('/test/getuser/:user_id', function (req, res, next) {
	var user_id = req.params.user_id;
	dbHandler.getUser(user_id)
		.then(function (datas) {
			res.send(datas);
		}, function (error) {
			console.log('getUser Error:', error);
			res.send({
				error: true,
				message: "Failed to getUser info"
			});
		});
});


module.exports = router;