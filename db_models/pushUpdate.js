// DB 연결 파일 require
var pool = require('./dbConnect');

// pushID 업데이트
exports.pushUpdate = function (datas, callback) {
	pool.getConnection(function (err, conn) {
		if(err) {
			cosole.log('err : ', err);
			var error = 'DB_connection_error';
			callback(error);
		} else {
			var sql = 'UPDATE users SET push_id=? WHERE email=?';
			conn.query(sql, datas, function (err, rows) {
				if(err) {
					console.log('err : ', err);
					var error = 'UPDATE_query_error';
					conn.release();
					callback(error);
				} else {
					if(rows.affectedRows == 1) {
						var result = true;
						conn.release();
						callback(result);
					}
				}
			});
		}
	});
};