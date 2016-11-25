/*
dbHandler.js
Handling for gcm_chat End-points.
*/
var pool = require('./dbConfig'),
	Promise = require('bluebird'),
	async = require('async'),
	TimeStamp = require('../gcm/timeStamp');


var createUser = function(user_id, name, email, univId){
	return new Promise(function (resolve, reject) {
		isUserExists(email, function(err, isExists) {
			if(err) reject(err);
			if(!isExists){
//				console.log("1-->",isExists);
				pool.getConnection(function (err, conn) {      
					if (err) {
						console.log('error', err);
						reject(err);
						return;
					}
					var input = [];
					var sql = '';
					if(user_id === -1){
						//gcm3.0 테스트앱이 작동할때 에러 피하기 위해 임시로 넣는 코드
						input = [name, email];
						sql = 'INSERT INTO users(name, email) VALUES(?, ?)';
					} else {
						//my-sql auto_increment 사용시 user_id가 0이면 안들어감. 오토넘버가 생성되서 저장됨.
						input = [user_id, name, email];
						sql = 'INSERT INTO users(user_id, name, email) VALUES(?, ?, ?)';	
					}
				    conn.query(sql, input, function (err, results) {
				    	if (err) {
				           err.code = 500;
				           conn.release();
				           return reject(err);
				           
				        }
				    	getUserByEmail(email, function(err, user){
				    		if(err) {
				    			conn.release();		//Insert query's connection.
				    			return reject(err); 
				    		}
				    		var datas = {
				    			error: false,
				    			user: {
				    				user_id: user.user_id,
				    				name: user.name,
				    				email: user.email,
				    				created_at: user.created_at,
				    				univId: univId
				    			}
				        	};
				    		conn.release();		//Insert query's connection.
				    		resolve(datas);
				    	});
				    });
				});	
			} else {
//				console.log("2-->", isExists);
				getUserByEmail(email, function(err, user){
					if(err) {console.log('error', err); return reject(err);}
		    		var datas = {
		    			error: false,
		    			user: {
		    				user_id: user.user_id,
		    				name: user.name,
		    				email: user.email,
		    				created_at: user.created_at,
		    				univId: univId
		    			}
		        	};
		    		resolve(datas);
		    	});
			} //else
		});
				
	});
};

var updateGcmID = function(user_id, gcm_registration_id){
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
		    var sql = 'UPDATE users SET gcm_registration_id = ? WHERE user_id = ?';
		    var input = [gcm_registration_id, user_id ];
		    conn.query(sql, input, function (err, results) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
//		    	console.log("updateGcmID:", results);
		    	if(results.affectedRows === 1){
			        var datas = {
			    		error: false,
			    		message: 'GCM registration ID updated successfully'
			        };
			        conn.release();	//release하는 순서가 영향이 있나?
			        resolve(datas);
		    	} else {
		    		conn.release();	
		    		reject(new Error(results.message));
		    	}
		    });
		});
	});
};

var getAllChatRooms = function(){
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
		    var sql = 'SELECT * FROM chat_rooms ORDER BY created_at DESC';
		    conn.query(sql, function (err, rooms) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
		    	var datas = {
		    			error: false,
		    			chat_rooms: rooms
			    };
		    	conn.release();
			    resolve(datas);
		    });
		});
	});	
};
function generateInQuery(sql, roomList){
//	var sql = 'SELECT * FROM chat_rooms WHERE chat_room_id IN(';
	var newSql = sql;
    var i;
	for(i=0; i< roomList.length; i++){
		newSql += roomList[i] + ',';
	}
	newSql = newSql.substr(0, newSql.length-1);	//마지막 ','제거
	newSql += ')';
	return newSql;
}
var getJoinedChatRooms = function(roomList){
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
		    var sql = 'SELECT * FROM chat_rooms WHERE chat_room_id IN(';
		    sql = generateInQuery(sql, roomList);
		    sql += ' ORDER BY created_at DESC';
			console.log("joinedRoom Query:", sql);
		    conn.query(sql, function (err, rooms) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
		    	var datas = {
		    			error: false,
		    			chat_rooms: rooms
			    };
		    	conn.release();
			    resolve(datas);
		    });
		});
	});	
};

var getChatRoomsLastMsg = function(roomList){
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
			var sql = 'SELECT c.name, c.chat_room_id, m.message AS last_msg, m.message_id, m.created_at FROM  chat_rooms as c LEFT JOIN messages as m ON c.chat_room_id = m.chat_room_id WHERE c.chat_room_id IN (';
		    sql = generateInQuery(sql, roomList);
			sql += ' AND m.created_at = (select MAX(m2.created_at) from messages as m2 GROUP BY m2.chat_room_id HAVING m2.chat_room_id = m.chat_room_id) ORDER BY m.created_at DESC';
			// console.log("getChatRoomsLastMsg Query:", sql);
		    conn.query(sql, function (err, rooms) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
		    	// var datas = {
		    	// 		error: false,
		    	// 		chat_rooms: rooms
			    // };
		    	conn.release();
			    resolve(rooms);
		    });
		});
	});	
};


var getChatRoomMsg = function(chat_room_id){
	//To get all Chat Messages from chat_room_id
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
		    var sql = 'SELECT cr.chat_room_id, cr.name, cr.created_at as chat_room_created_at, u.name as username, c.* FROM chat_rooms cr LEFT JOIN messages c ON c.chat_room_id = cr.chat_room_id LEFT JOIN users u ON u.user_id = c.user_id WHERE cr.chat_room_id = ? ORDER BY c.created_at';
		    conn.query(sql, chat_room_id, function (err, joinedItem) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
		    	var datas = {
		    			error: false,
		    			messages: [],
		    			chat_room: {}
			    };
		    	joinedItem.forEach(function(item, index, array){
		    		if(index === 0){
		    			var tmp = {};
		    			tmp.chat_room_id = item.chat_room_id;
		    			tmp.name = item.name;
		    			tmp.created_at = item.created_at;
		    			datas.chat_room = tmp;
//		    			console.log(index);
//		    			console.log(array);
		    		}
		    		if(item != null){
		    			var cmt = {};
		    			cmt.message = item.message;
		                cmt.message_id = item.message_id;
		                cmt.created_at = item.created_at;
//		                모든메시지에 chat_room_id를 달아 보내는 것은 불필요하므로 위 요청처럼 chat_room 바디 한번만 보냄.
//		                cmt.chat_room_id = item.chat_room_id;
		                
		                var user = {};
		                user.user_id = item.user_id;
		                user.username = item.username;
		                cmt.user = user;
		                datas.messages.push(cmt);
//		                console.log(datas);
		    		}
		    	});
		    	conn.release();
			    resolve(datas);
		    });
		});
	});
};
var getChatRoomMsgByTime = function(chat_room_id, joined_at){
	//overriding getChatRoom function. added 'joined_at' parameter
	return new Promise(function (resolve, reject) {
		var input = [chat_room_id, joined_at];
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
		    var sql = 'SELECT cr.chat_room_id, cr.name, cr.created_at as chat_room_created_at, u.name as username, c.* FROM chat_rooms cr LEFT JOIN messages c ON c.chat_room_id = cr.chat_room_id LEFT JOIN users u ON u.user_id = c.user_id WHERE (cr.chat_room_id = ? AND c.created_at >= ? ) ORDER BY c.created_at';
//		    console.log('sql:', sql);
		    conn.query(sql, input, function (err, joinedItem) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
		    	var datas = {
		    			error: false,
		    			messages: [],
		    			chat_room: {}
			    };
		    	joinedItem.forEach(function(item, index, array){
		    		if(index === 0){
		    			var tmp = {};
		    			tmp.chat_room_id = item.chat_room_id;
		    			tmp.name = item.name;
		    			tmp.created_at = item.created_at;
		    			datas.chat_room = tmp;
		    		}
		    		if(item != null){
		    			var cmt = {};
		    			cmt.message = item.message;
		                cmt.message_id = item.message_id;
		                cmt.created_at = item.created_at;
		                
		                var user = {};
		                user.user_id = item.user_id;
		                user.username = item.username;
		                cmt.user = user;
		                datas.messages.push(cmt);
		    		}
		    	});
		    	conn.release();
			    resolve(datas);
		    });
		});
	});
};
var addMessage= function(user_id, chat_room_id, message){
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
			var timeStamp = TimeStamp.getCurrentTimeStamp();
//			console.log('addMessage->timeStamp: ', timeStamp);
			var input = [chat_room_id, user_id, message, timeStamp];
		    var sql = 'INSERT INTO messages (chat_room_id, user_id, message, created_at) values(?, ?, ?, ?)';
//		    console.log('addMessage->sql: ', sql);
		    var datas = {
        			error: false,
        			message: {}
    	    };
		    conn.query(sql, input, function (err, result) {
		    	if (err) { conn.release(); reject(err); }
//		    	console.log("insert Result:", result);
		    	if(result.affectedRows > 0){
		    		var message_id = result.insertId;
		    		var sql2 = "SELECT message_id, user_id, chat_room_id, message, created_at FROM messages WHERE message_id = ?";
		    		conn.query(sql2, message_id, function(err, rows){
		    			var row = rows[0];
		    			var tmp = {};
		    			tmp.message_id= row.message_id;
		    			tmp.chat_room_id= row.chat_room_id;	//int type
		    			tmp.message= row.message;
		    			tmp.created_at= row.created_at;
		    			datas.message = tmp;
		    			conn.release();
				    	resolve(datas);
		    		});
		    	} else {
		    		conn.release();
		    		reject(new Error('Faild to get added msg'));
		    	}
		    });
		});
	});	
};

var getUser = function(user_id){
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
			var sql = 'SELECT user_id, name, email, gcm_registration_id, created_at FROM users WHERE user_id = ?';
		    conn.query(sql, user_id, function (err, results) {
		    	if (err) {
		           conn.release();
		           reject(err);
		        }
//		    	console.log("getUser Result: ", result);
		    	if(results !== undefined && results !== null){
//		    		var user = {};	//객체 생성을 이렇게하면 빈객체가 리턴됨. --> user_id, name... 등 모두가 선언되어 있어야 함
//			    	user.user_id = result.user_id;
//			    	user.name = result.name;
//			    	user.email = result.email;
//			    	user.gcm_registration_id = result.gcm_registration_id;
//			    	user.created_at = result.created_at
			        conn.release();
			        resolve(results[0]);	
		    	} else {
		    		conn.release();
		    		reject(new Error(results.message));
		    	}
		    	
		    });
		});		
	});
};
var getUsers = function(to_user_ids){
	//fetching multiple users by ids
	return new Promise(function (resolve, reject) {
		if(to_user_ids.length > 0){
			var sql = "SELECT user_id, name, email, gcm_registration_id, created_at FROM users WHERE user_id IN (";
			async.waterfall(
			[
			 function (callback) {
				var i;
				for(i=0; i< to_user_ids.length; i++){
					sql += to_user_ids[i] + ',';
				}
				sql = sql.substr(0, sql.length-1);	//마지막 ','제거
				sql += ')';
				callback(null, sql);
			 }, 
			 function (sql, callback) {
				 callback(null, sql);
			 }], 
			 function (err, query) { 
				if(err) {reject(err);}
				pool.getConnection(function (err, conn) {      
					if (err) { reject(err); }
				    conn.query(query, function (err, rows) {
				    	if (err) {
				           conn.release();
				           reject(err);
				        }
				    	conn.release();
				    	resolve(rows);
				    });
				});
			});
		} else {
			reject(new Error('user_ids.length Error'));
		}
	});
};

var createChatRoom = function(room_name){
//	INSERT INTO `chat_rooms` (`chat_room_id`, `name`, `created_at`) VALUES (1, 'Material Design', '2016-01-06 06:57:40');
//	var addMessage= function(user_id, chat_room_id, message){
//	 fromUserId와 chatRoomId, message 파라미터 필요
	
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
			var timeStamp = TimeStamp.getCurrentTimeStamp();
			var input = [room_name, timeStamp];
		    var sql = 'INSERT INTO chat_rooms (name, created_at) values(?, ?)';
		    conn.query(sql, input, function (err, result) {
		    	if (err) { conn.release(); reject(err); }
//		    	console.log("addChatRoom Result:", result);
		    	if(result.affectedRows > 0){
		    		var chat_room_id = result.insertId;
		    		conn.release();
		    		resolve(result);
		    		//생성된 챗룸 아이디로 addChat 함수 호출
		    	} else {
		    		conn.release();
		    		reject(new Error('Faild to Insert ChatRoom'));
		    	}
		    });
		});
	});
};


//private functions
function isUserExists(email, cb){
	pool.getConnection(function (err, conn) {      
		if (err) { cb(err); }
	    var sql = 'SELECT user_id FROM users WHERE email = ?';
	    conn.query(sql, email, function (err, results) {
	    	if (err) {
	           conn.release();
	           cb(err);
	        }
//	    	console.log("results: ", results[0]);
	        conn.release();
//	        console.log("Exists:# ", results.length>0);
	        cb(null, results.length > 0);
	    });
	});
};
function getUserByEmail(email, cb){
	pool.getConnection(function (err, conn) {      
		if (err) { cb(err); }
	    var sql = 'SELECT user_id, name, email, created_at FROM users WHERE email = ?';
	    conn.query(sql, email, function (err, user) {
	    	if (err) {
	           conn.release();
	           cb(err);
	        }
	        conn.release();
	        cb(null, user[0]);
	    });
	});
};

var testQuery = function(name, email){
	//성공하면 resolve(리턴값), 실패하면 reject(error)
	console.log(isUserExists());
	return new Promise(function (resolve, reject) {
		pool.getConnection(function (err, conn) {      
			if (err) { reject(err); }
			var sql = 'SELECT * FROM users';
		    conn.query(sql, function (err, results) {
		    	if (err) {
		           err.code = 500;
		           conn.release();
		           reject(err);
		        }
		        var movieList = {
		           count: results.length,
		           data: results
		        };
		        conn.release();
		        resolve(movieList);
		    });
		});		
	});
};

module.exports = function () {
	
	return{
		createUser: createUser,
		updateGcmID: updateGcmID,
		getAllChatRooms: getAllChatRooms,
		getJoinedChatRooms: getJoinedChatRooms,
		getChatRoomsLastMsg: getChatRoomsLastMsg,
		getChatRoomMsg: getChatRoomMsg,
		getChatRoomMsgByTime: getChatRoomMsgByTime,
		addMessage: addMessage,
		getUser: getUser,
		getUsers: getUsers,
		createChatRoom: createChatRoom,
		
		testQuery: testQuery
	};
};