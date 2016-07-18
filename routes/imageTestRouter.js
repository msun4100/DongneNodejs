var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities'),
	ObjectID = require('mongodb').ObjectID,
	config = require('../config');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel'),
	CommentThread = require('../db_models/commentModel').CommentThread,
	Reply = require('../db_models/commentModel').Reply,
	Board = require('../db_models/boardModel'),
	Main = require('../db_models/pageModel'),
	Movie = require('../db_models/movieModel');

var imageManager = require('./savePic');
//imageManager.saveRequest(req, options, function(err){});

var fs = require('fs');
var pathUtil = require('path');
var url = require('url');
var formidable = require('formidable');

var multer  = require('multer');
var connection = require('../db_models/mongodbConfig');
var dbService = require('../db_models/dbService')(connection);

var uploadDir = __dirname + '/uploads';
var imageDir = __dirname + '/images';


var initialDB = fs.readFileSync('./initialDB.json');
var movieList = JSON.parse(initialDB);

//====================================
var rabbitPromise = require('../queue/rabbit');
var gcmProvider = require('../middleware/gcmProvider');
var exchange = require('../queue');
router.get('/push', function(req, res, next){
	rabbitPromise.done(function(rabbit) {
		rabbit.queue('', {exclusive: true, autoDelete: true}, function(q){
			q.bind(config.rabbitMQ.exchange, q.name);
		    rabbit.publish('gcm_push', {card: 'details'}, {replyTo: q.name});
		    q.subscribe(function(message){
		    	console.log("워커에서보낸 메시지:", message);
		        q.destroy();
		        q.close();
		        res.send('Charged! Thanks!');
		    });
		});	
	});
});

/*
'/' 페이지 파일 올려서 서브밋하면 updatePic post 실행됨
uploads파일에 임시로 올려서( multer 사용) 거기 있는 파일을 photo gridfs에 저장함
finally 함수에서 uploads 폴더의 임시파일 삭제
/getPic/:objectId 로 해당 이미지 받아 볼수 있음
*/
router.post('/updatePic/:userId', multer({dest:'./uploads'}).single('photo'),function (req,res,next) {
	
	console.log("req.file:", req.file);
	console.log("req.body", req.body);

	var userId = req.params.userId;
	dbService.writeFileToDb({
		readStream:fs.createReadStream(req.file.path),
		fileName:req.file.originalname,
		collection:'photos'
	}).then(function (objectId) {
		console.log("objectId: ", objectId);
		User.update({"userId": userId}, { "$set": {"pic": objectId}}, function(err, doc){
			if(err) { console.log("err", err.message);return next(err); }
			console.log("doc", doc);
			if(doc.n === 1){
				res.send({ error: false, message: ""+objectId, result: ""+objectId });
			} else {
				res.send({ error: true, message: "Failed to User's profile update" });
			}
		});
	},function (error) {
		console.log("error: ", error.message);
		res.send({ error: true, message: error.message });
//		res.status(500).send(error);
	}).finally(function () {
		fs.unlink(req.file.path);	//uploads 폴더에 올라간 임시파일 삭제
	});
});

router.get('/getPic/:userId',function (req, res, next) {
	var userId = req.params.userId;
	User.find({"userId": userId}).then(function(docs){
		var pic = docs[0].pic;
		dbService.readFileFromDb({
			objectId: pic,
			writeStream: res,	//res가 아니라 docs[i].img/pic에 스트림연결 하면??
			collection:'photos'
		})//configurations
		.then(function (objectId) {
			res.end();
		},function (error) {
			res.send({
				error: true,
				message: error.message
			});
		});	
	}, function(err){
		res.send({
			error: true,
			message: 'User not found error'
		});
	});
//	dbService.readFileFromDb({
//		objectId:req.params.objectId,
//		writeStream:res,	//res가 아니라 docs[i].img/pic에 스트림연결 하면??
//		collection:'photos'
//	})//configurations
//	.then(function (objectId) {
//		res.end();
//	},function (error) {
//		res.send({
//			error: true,
//			message: error.message
//		});
//	});
});

router.get('/images/init', initData);

router.get('/images', showList);
router.get('/images/origin', showListOrigin);
router.get('/images/:path', function(req, res){
	var parsed = url.parse(req.url);
    // 127.0.0.1:3000/images/Avata.jpg?12331 에서 ?이후 쿼리문을 제외한 경로 
    var path = __dirname + parsed.pathname; // /images/Avata.jpg
    fs.access(path, function(err) {
       if ( err ) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
       }
       var is = fs.createReadStream(path);
       is.pipe(res);
    });
});

router.get('/images/getPic/:objectId',function (req, res, next) {
	Movie.find({title:"multi5"}, function(err, docs){
		//res가 아니라 docs[i].img/pic에 스트림연결 하면??
		var options = {
				connString: config.multiparty.connString,
				root: "mul",
				writeStream: res,
				pic_id: req.params.objectId,
				chunks: config.multiparty.mulChunks
		};
		imageManager.getPicBuffer2(req.params.objectId, options, function(err, result) {
//		imageManager.getPicBuffer(req.params.objectId, options, function(err, result) {
			if (err) {
				return next(err);
			} else {
				if(result){
					console.log("result:", result);
//					docs[0].img.data = result.data;
					res.send({msg: 'getPic success', result: docs[0], image: result.data.toString('base64')});	
				} else {
					res.send('result is nullable');
				}
				
			}    
		});		
	});
});

//router.post('/images', addNewMovie);
router.post('/images', addNewMovieMultiparty);
function addNewMovieMultiparty(req, res, next){
	var info = {	//schema
	         title : "",
	         director : "",
	         year : 0,
	         poster : "",
	         img: {},
	         pic: {}
	      };
	var options = {
			connString: config.multiparty.connString,
			root: "mul",
			request: info
	};
	
	imageManager.saveRequest(req, options, function(err, result) {
		if (err) {
			return next(err);
		} else {
			res.send(result);
		}    
	});	
}


function addNewMovie(req, res) {
	   var form = new formidable.IncomingForm();
	   form.keepExtenstion = true;
	   form.uploadDir = uploadDir;
	   form.parse(req, function(err, fields, files) {
	      if ( err ) {
	         res.statusCode = 404;
	         res.end('Error');
	         return;
	      }
	      
	      var title = fields.title;
	      var director = fields.director;
	      var year = fields.year;
	      
	      var poster = files.poster;
//	      console.log(files.poster);
	      console.log(files.poster.type);
	      console.log(files.poster.path);
	      // poster.path;
	      var ext = pathUtil.extname(poster.name);
	      var newFileName = title + ext;
	      var newPath = imageDir + pathUtil.sep + newFileName;
	      
	      fs.renameSync(poster.path, newPath);
	      var url = '/images/' + newFileName; // /images/Starwars7.jpg
	      
	      var info = {
	         title : title,
	         director : director,
	         year : year,
	         poster : url,
//	         fs.readFileSync(req.files.userPhoto.path)
	         img: { data: fs.readFileSync(__dirname + url), contentType: files.poster.type}
	      };
	      movieList.push(info);
	      
	      var movie = new Movie(info);
	      movie.save(function(err, doc){
	    	  console.log('saved', doc);
	    	  
	    	  res.statusCode = 302;
		      res.setHeader('Location', '/images');
		      res.end();
	      });
	                
	   });

}

function showList(req, res) {
	   var html = '<html>';
	   html += '<head>';
	   html += '<meta charset="UTF8">';
	   html += '<style>';
	   html += 'form label { width:100px; display:inline-block; }'
	   html += 'li img { height:100px }';
	   html += '</style>';
	   html += '</head>';
	   html += '<body>';
	   html += '<h1>Favorite Movie</h1>';
	   html += '<div>';
	   html += '<ul>';
	   Movie.find({}, function(err, docs){
//		   console.log("asdsad",docs);
//		   <img src="data:image/gif;base64,xxxxxxxxxxxxx...">
//		   Where the xxxxx... part is a base64 encoding of gif image data.
//	        res.contentType(doc[0].img.contentType);
//	        res.send(doc[0].img.data)
		   
//			 var base64 = (doc[0].img.data.toString('base64'));
//			 console.log('base64.length:', base64.length);
//			 console.log(base64);
//	         res.send(base64);
		   docs.forEach(function(movie, index, array){
			      html += '<li>';
			      if ( movie.pic.id ) {
			    	  html += '<img src="' +"http://localhost:3000/images/getPic/"+ movie.pic.id +'">';
			      } else if ( movie.img.data ) {
//			    	  html += '<img src="http://www.google.com/intl/en_ALL/images/logo.gif">';
				      html += '<img src="' +"data:"+movie.img.contentType+";base64," + movie.img.data.toString('base64') +'">';
//				      console.log("<<", movie.img.data.toString('base64'));
				  } 
			      html += movie.title + '(' + movie.director + ',' + movie.year + ')' + '</li>';
		   });
		   html += '</ul>';
		   html += '</div>';	   
		   html += '<form method="post" action="/images" enctype="multipart/form-data">';
		   html += '<h4>새 영화 입력</h4>';
		   html += '<ul>';
		   html += '<li><label>영화 제목</label><input type="text" name="title"></li>';
		   html += '<li><label>영화 감독</label><input type="text" name="director"></li>';
		   html += '<li><label>연도</label><input type="number" name="year"></li>';
		   html += '<li><label>포스터</label><input type="file" name="poster"></li>';   
		   html += '</ul>';
		   html += '<input type="submit" value="올리기">';
		   html += '</form>';
		   
		   html += '</body>';
		   html += '</html>';
		   res.writeHeader(200, {'Contnet-Type':'text/html'});
		   res.end(html);
	   });
	}//func

function showListOrigin(req, res) {
	   var html = '<html>';
	   html += '<head>';
	   html += '<meta charset="UTF8">';
	   html += '<style>';
	   html += 'form label { width:100px; display:inline-block; }'
	   html += 'li img { height:100px }';
	   html += '</style>';
	   html += '</head>';
	   html += '<body>';
	   html += '<h1>Favorite Movie</h1>';
	   html += '<div>';
	   html += '<ul>';
	   movieList.forEach(function(movie) {
	      html += '<li>';
	      if ( movie.poster ) {
	         html += '<img src="' + movie.poster +'">';
	      }
	      html += movie.title + '(' + movie.director + ',' + movie.year + ')' + '</li>';
	   });
	   html += '</ul>';
	   html += '</div>';
	   html += '<div>';
	   html += '<ul>';
	   html += '</ul>';
	   html += '</div>';	   
	   html += '<form method="post" action="/images" enctype="multipart/form-data">';
	   html += '<h4>새 영화 입력</h4>';
	   html += '<ul>';
	   html += '<li><label>영화 제목</label><input type="text" name="title"></li>';
	   html += '<li><label>영화 감독</label><input type="text" name="director"></li>';
	   html += '<li><label>연도</label><input type="number" name="year"></li>';
	   html += '<li><label>포스터</label><input type="file" name="poster"></li>';   
	   html += '</ul>';
	   html += '<input type="submit" value="올리기">';
	   html += '</form>';
	   
	   html += '</body>';
	   html += '</html>';
	   res.writeHeader(200, {'Contnet-Type':'text/html'});
	   res.end(html);
	}//func


function initData(req, res, next){
	 var movie1 = new Movie({title:'인터스텔라', director:'크리스노퍼 놀란', year:2014, poster:'/images/Interstella.jpg'});
	 movie1.save(function(err, result, rows) {
	    if ( err ) {
	       console.error('Error : ', err);      
	    }
	    else {
	       console.log('Success');
	    }
	 });
	
	 Movie.create({title:'아바타', director:'제임스 카메론', year:2010, poster:'/images/Avata.jpg'}).then(function fulfilled(result){
	    console.log('Success : ', result);
	 }, function rejected(err) {
	    console.error('Error : ', err);
	 });
	
	 Movie.create({title:'스타워즈', director:'조지 루카스', year:1977, poster:'/images/Starwars1.jpg'}, function(err, result) {
	    if ( err ) {
	       console.error('Error : ', err);
	    }
	    else {
	       console.log('Success : ', result);
	    }
	 });
	 
	 res.send('init success');
}
	
	module.exports = router;