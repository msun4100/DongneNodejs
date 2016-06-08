// dbConfig.js

// DB 설정 정보를 만들어두고 이를 참조하도록 한다
var mysql = require('mysql');

var dbConfig = {
//	connectionLimit: 250,
	host: '127.0.0.1',
	user: 'root',	// root
	password: '1111',	// 1119
	port: 3306,
	multipleStatements : true,
	database: 'dongne'
};

// pool 변수에 connection에 쓸 mysql Pool 값을 저장
var pool = mysql.createPool(dbConfig);

module.exports = pool;