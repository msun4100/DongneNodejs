var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config'),
	fs = require('fs');

var AWS = require('aws-sdk'),
	request = require('request');
AWS.config.region = 'ap-northeast-2';


var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Main = require('../db_models/pageModel'),
	Movie = require('../db_models/movieModel');

var multer  = require('multer'),
	im = require('imagemagick');

var uploadDir = __dirname + '/uploads',
	imageDir = __dirname + '/images';

router.post('/updatePic/user/:userId', multer({dest:'./uploads'}).single('photo'),function (req,res,next) {
	console.log("req.file:", req.file);
	console.log("req.body", req.body);
	var userId = req.params.userId;
	var reqDate = req.body.reqDate;
	
	var largeImgName = config.im.largeImgName.replace(":userId", userId);
	var smallImgName = config.im.smallImgName.replace(":userId", userId);
//    var largePath = __dirname + config.im.largePath + imageName;
    var thumbPath = __dirname + config.im.thumbPath + smallImgName;
    
    var s3 = new AWS.S3();
    var params = {
            Bucket:'schooler.image',
            Key: largeImgName,
            ACL:'public-read',
            Body: fs.createReadStream(req.file.path)
    };
    s3.upload(params, function(err, data){
        if(err){
        	return res.send({ error: true, message:'error occurred while s3 upload'});
        }
        else {
        	var width = config.im.small.width,
        	height = config.im.small.height;
        	im.resize({ 
        		srcPath: req.file.path, 
//				srcData: fs.createReadStream(req.file.path),
        		dstPath: thumbPath, 
        		width: width,
        		height : height
        	}, function(err, stdout, stderr){
        		if (err) { return next(err); }
        		console.log('resized image to fit within '+ width +"*"+ height +"px");
        		params.Key = smallImgName;
        		params.Body = fs.createReadStream(thumbPath);
        		s3.upload(params, function(err, data){
        			if(err){
        				return res.send({ error: true, message:'error occurred while s3 upload'});
        			} else {
        				fs.unlink(req.file.path);	//uploads 폴더에 올라간 임시파일 삭제	
        				fs.unlink(thumbPath);	        			
        				res.send({ error: false, message: "userId: "+ userId, result: data.Location });
        			}
        		});
        	});
        }	    
    });
});

router.get('/getPic/user/:userId/:size',function (req, res, next) {
	var userId = req.params.userId,
		size = req.params.size;	//'small' or 'large'
	if(size === undefined || userId === undefined) { return res.send({error: true, message: ' args error'}); }
	var key = "";
	if(size.toLowerCase() === "small"){
		key = config.im.smallImgName.replace(":userId", userId);
	}
	else {
		key = config.im.largeImgName.replace(":userId", userId);
	}
    var s3 = new AWS.S3();
//    var file = require('fs').createWriteStream('Avata.jpg');
    var params = {Bucket:'schooler.image', Key: key};
    s3.getObject(params).createReadStream().on('error', function(err){
//    	res.send({error: true, message: 'error occurred'});
    	getDefaultImg(req, res, err.message);
    }).pipe(res);
});

router.delete('/deletePic/user/:userId',function (req, res, next) {
	var id = req.params.userId;
	if(!req.params.userId){
		return res.send({error: true, message: 'params length error'});
	}
	var files = [];
	var file1 = {};
	file1.filename = "";
	file1.filename = "user_" + id + "_small";
	files.push(file1);
	var file2 = {};
	file2.filename = "";
	file2.filename = "user_" + id + "_large";
	files.push(file2);
	
	var s3 = new AWS.S3();
	
	async.each(files, function iterator(file, callback) {
//	    var copyParams = {
//	        Bucket: 'schooler.image',
//	        CopySource: 'schooler.image/' + file.filename,
//	        Key: 'copy/'+file.filename
//	    };      
	    var deleteParam = {
	        Bucket: 'schooler.image',
	        Key: file.filename
	    };
//	    s3.copyObject(copyParams, function(err, data) {
//	        if (err) { callback(err); }
//	        else {
//	            s3.deleteObject(deleteParam, function(err, data) {
//	                if (err) { callback(err); }
//	                else {
//	                    console.log('delete', data);
//	                    callback(null, data);
//	                }
//	            });
//	        }
//	    });
        s3.deleteObject(deleteParam, function(err, data) {
        	if (err) { callback(err); }
        	else {
        		console.log('delete', data);
        		callback(null, data);
        	}
        });
	}, function allDone(err, data) {
	    //This gets called when all callbacks are called
	    if (err) {
	    	console.log(err, err.stack);
	    	res.send({error: true, message: err.message});
	    }
	    else {
	    	res.send({error: false, message: 'All done'});
	    }
	});	
});


function getDefaultImg(req, res, msg){
    var path = __dirname + "/images/e__who_icon.png"; // 
    fs.access(path, function(err) {
       if ( err ) {
    	   console.log("getDefaultImg func error occurred");
    	   res.send({error: true, message:'default img Not Found'});
    	   return;
       }
       console.log("getDefaultImg: " + msg);
       var is = fs.createReadStream(path);
       is.pipe(res);
    });
}

router.post('/updatePic/board/:boardId', multer({dest:'./uploads'}).single('photo'),function (req,res,next) {
	console.log("req.file:", req.file);
	console.log("req.body", req.body);
	var boardId = req.params.boardId;
	var reqDate = req.body.reqDate;
	
	var imgs = [];
	if(boardId){
		imgs.push("board_" + boardId);	
	} else {
		return next(new Error('boardId undefined error'));
	}
    var thumbPath = __dirname + config.im.thumbPath + imgs[0];	//resize img target path
    var width = config.im.board.width,
		height = config.im.board.height;
	im.resize({ 
		srcPath: req.file.path, 
//		srcData: fs.createReadStream(req.file.path),
		dstPath: thumbPath, 
		width: width,
		height : height
	}, function(err, stdout, stderr){
		if(err){ return next(err);}
		var s3 = new AWS.S3();
	    var params = {
	            Bucket:'schooler.board',
	            Key: imgs[0],
	            ACL:'public-read',
	            Body: fs.createReadStream(thumbPath)
	    };
		s3.upload(params, function(err, data){
			if(err){
				return res.send({ error: true, message:'error occurred while s3 upload'});
			} else {
				console.log("data.Location:", data.Location);
				console.log("imgs[0]", imgs[0]);
				fs.unlink(req.file.path);	//uploads 폴더에 올라간 임시파일 삭제	
				fs.unlink(thumbPath);	    //resize 한 임시파일 삭제
				Board.update( {"boardId": boardId, "pic":{"$ne": imgs[0]} }, {"$push": {"pic": imgs[0]}}, function (err, doc) {
					if(err){return next(err);}
					res.send({ error: false, message: "boardId: "+ boardId, result: imgs[0] });	
				});
			}	    
	    });	
	});
    
});

router.get('/getPic/board/:imgKey',function (req, res, next) {
	if(!req.params.imgKey) { return res.send({error: true, message: 'board img args undefined error'}); }
	var imgKey = req.params.imgKey;
    var s3 = new AWS.S3();
    var params = {Bucket:'schooler.board', Key: imgKey};
    s3.getObject(params).createReadStream().on('error', function(err){
    	getDefaultImg(req, res, err.message);
    }).pipe(res);
});


module.exports = router;