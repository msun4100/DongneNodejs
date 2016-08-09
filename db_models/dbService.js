var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var fs = require('fs');
var Promise = require('bluebird');
var ObjectId = mongoose.Types.ObjectId;
Grid.mongo = mongoose.mongo;

var gfs;

//writeFileToDb호출할때 objectId를 호출할때 지정해줌.
//1. 유저디비 검색해서 이미 pic에 오브젝트 아이디가 있으면 그 오브젝트 아이디를 사용하게 하고
//2. 없으면 새로운 오브젝트 아이디를 생성.

var writeFileToDb = function (config) {
	return new Promise(function (resolve,reject) {
//		var objectId = ObjectId();
		var readStream = config.readStream;
		var writeStream = gfs.createWriteStream({
//			_id:objectId,
//			mode: 'w',
			_id: config.objectId,
			filename: config.fileName,
			root:config.collection,	//photos
			uploadDate: config.uploadDate
		});
		readStream.pipe(writeStream);
		writeStream.on('close',function () {
			resolve(config.objectId);
		});
		writeStream.on('error',function (error) {
			reject(error);
		});
		readStream.on('error',function (error) {
			reject(error);
		});
	});
};

var readFileFromDb = function (config) {
	return new Promise(function (resolve,reject) {
		var readStream = gfs.createReadStream({
			_id:config.objectId,
			root:config.collection
		});
		var writeStream = config.writeStream;	//res
		readStream.pipe(writeStream);	//read한 파일스트림을 res와 파이프 연결
		writeStream.on('close',function () {
			resolve();
		});
		writeStream.on('error',function (error) {
			reject(error);
		});
		readStream.on('error',function (error) {
			reject(error);
		});
	});
};

module.exports = function (connection) {
	gfs = Grid(connection.db);
	return{
		writeFileToDb:writeFileToDb,
		readFileFromDb:readFileFromDb
	};
};