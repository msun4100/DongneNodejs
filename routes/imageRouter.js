var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config'),
	fs = require('fs');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Main = require('../db_models/pageModel'),
	Movie = require('../db_models/movieModel');

var multer  = require('multer'),
	im = require('imagemagick'),
	connection = require('../db_models/mongodbConfig'),
	dbService = require('../db_models/dbService')(connection);

var uploadDir = __dirname + '/uploads',
	imageDir = __dirname + '/images';

router.post('/updatePic/user/:userId', multer({dest:'./uploads'}).single('photo'),function (req,res,next) {
	
	console.log("req.file:", req.file);
	console.log("req.body", req.body);
//	console.log("Date.now", Date.now);	//function now() { [native code] }
//	console.log("Date.now()", Date.now());//1470034177845
	//reqDate로 심플데이터포맷 스트링 받아야함.
	
	var userId = req.params.userId;
	var reqDate = req.body.reqDate;
	User.find({userId: userId}, function(err, users){
		if(err) return next(err);
		if(users.length !== 1) return res.send({error: true, message: "user_length_error"});
		var user = users[0];
		var smallObjId, largeObjId; 
		if(user.pic.small === ""){
			smallObjId = ObjectID();
		} else {
			smallObjId = user.pic.small;
		}
		if(user.pic.large === ""){
			largeObjId = ObjectID();
		} else {
			largeObjId = user.pic.large;
		}
		
//		파일 이름을 user_#_large / user_#_small
		var largeImgName = config.im.largeImgName.replace(":userId", userId);
		var smallImgName = config.im.smallImgName.replace(":userId", userId);
//	    var largePath = __dirname + config.im.largePath + imageName;
	    var thumbPath = __dirname + config.im.thumbPath + smallImgName;
		dbService.writeFileToDb({
			objectId: largeObjId,
			readStream: fs.createReadStream(req.file.path),
			fileName: largeImgName,
			collection:'photos',
			uploadDate: reqDate
		}).then(function(mObjectId) { //objectId == largeId
			var mLargeId = mObjectId; //리턴된 obj아이디는 위에서 if/else로 지정한 objId와 같음
			var width = config.im.small.width,
				height = config.im.small.height;
			im.resize({ 
				srcPath: req.file.path, 
//				srcData: fs.createReadStream(req.file.path),
				dstPath: thumbPath, 
				width: width,
				height : height
			}, function(err, stdout, stderr){
				if (err) return next( err);
		        console.log('resized image to fit within '+ width +"*"+ height +"px");
				dbService.writeFileToDb({
					objectId: smallObjId,
					readStream: fs.createReadStream(thumbPath),
					fileName: smallImgName,
					collection:'photos',
					uploadDate: reqDate
				}).then(function(smallId){
					console.log("samllId:", smallId);
					User.update({"userId": userId}, { "$set": {"pic.small": smallId, "pic.large": mLargeId, "updatedAt": Date.now()}}, function(err, doc){
						if(err) { return next(err); }
						if(doc.n === 1){
							res.send({ error: false, message: "userId: "+ userId, result: ""+smallId });
						} else {
							res.send({ error: true, message: "Failed to User's profile update" });
						}
					});			
				}, function(error){
					res.status(500).send({ error: true, message: error.message });
				}).finally(function(){
					fs.unlink(req.file.path);	//uploads 폴더에 올라간 임시파일 삭제	
					fs.unlink(thumbPath);
				});
			});
		},function (error) {
			res.status(500).send({ error: true, message: error.message });
		});
	});
});

router.get('/getPic/user/:userId/:size',function (req, res, next) {
	var userId = req.params.userId,
		size = req.params.size;	//'small' or 'large'
	if(size === undefined || userId === undefined) return res.send({error: true, message: ' args error'});
	User.find({"userId": userId}).then(function(docs){
		var pic = "";
		if(size.toLowerCase() === "small") pic = docs[0].pic.small;
		else pic = docs[0].pic.large;
		if(pic === "" || pic === undefined){
			getDefaultImg(req, res, "empty thumbnail");
//			return res.send({error: true, message: "empty thumbnail"});
		} else {
			dbService.readFileFromDb({
				objectId: pic,
				writeStream: res,
				collection:'photos'
			})//configurations
			.then(function (objectId) {
				res.end();
			},function (error) {
//				res.send({ error: true, message: error.message });
				getDefaultImg(req, res, error.message);
			});				
		}//else
	}, function(err){
		getDefaultImg(req, res, 'User not found error');
//		res.status(500).send({ error: true, message: 'User not found error' });
	});
});

function getDefaultImg(req, res, msg){
    var path = __dirname + "/images/e__who_icon.png"; // 
    fs.access(path, function(err) {
       if ( err ) {
    	   console.log("getDefaultImg func error occurred");
    	   res.statusCode = 404;
    	   res.end('Not Found');
    	   return;
       }
       console.log("getDefaultImg: " + msg);
       var is = fs.createReadStream(path);
       is.pipe(res);
    });
}

module.exports = router;