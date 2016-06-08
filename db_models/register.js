// register.js

// DB 연결 파일 require
var pool = require('./dbConfig');
var async = require('async');

// 회원 정보 확인
var checkData = function (datas, callback) {
	pool.getConnection(function (err, conn) {
		if(err) {
			// DB connection error
			var error = 'DB_connection_error';
			callback(err, error);
		} else {
			var sql = 'SELECT COUNT(*) AS cnt FROM users WHERE email=?';
			conn.query(sql, datas[0], function (err, row) {
				// 결과 row가 배열 이므로 0번째에 있는 cnt 값이 count 된 값
				var cnt = row[0].cnt;
				if(err) {
					// DB query error
					var error = 'checkData_error';
					conn.release();
					callback(err, error);
				} else {
					if(cnt == 1) {
						// DB에 해당 id값이 이미 존재 하는 경우
						var error = 'userEmail_duplicated';
						conn.release();
						callback(error, error);
					} else {
						// DB에 해당 id값이 존재 하지 않는 경우
						conn.release();
						callback(null, datas);
					}
				}
			});
		}
	});
}

// 회원정보 입력
var regMember = function (datas, callback) {
	pool.getConnection(function (err, conn) {
		if(err) {
			// DB connection error
			var error = 'DB_connection_error';
			callback(err, error);
		} else {
			var sql = 'INSERT INTO users (email, password, push_id, reg_Date) VALUES(?, ?, ?, now())';
			conn.query(sql, datas, function (err, row) {
				if(err) {
					var error = 'regMember_error';
					conn.release();
					callback(err, error);
				} else {
					if(row.affectedRows == 1) {
						//성공
						var result = true;
						conn.release();
						callback(null, result);
					} else {
						var error = 'unknown_error';
						conn.release();
						callback(error, error);
					}
				}
			});
		}
	});
}

exports.register = function (datas, callback) {
	async.waterfall([
		function (callback) {
			checkData(datas, callback);
		}, function (datas, callback) {
			regMember(datas, callback);
		}
	], function (err, result) {
		if(err) console.log('err : ', err);
		callback(result);
	});
}