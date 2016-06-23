var multiparty = require("multiparty");
var async = require("async");
var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;
var Grid = require("gridfs-stream");
var mongoose = require("mongoose"),
	ObjectId = mongoose.Types.ObjectId,
	config = require("../config");

//호출 시
//var imageManager = require('./savePic');
//imageManager.saveRequest(req, options, function(err){});
var fs = require('fs');
module.exports.getPicBuffer = function (objectIdString, options, callback) {
	var context = {
	        db: null,
	        gfs: null,
	        gfsOps: 0,
	        root: options.root,
	        writeStream: options.writeStream,	//res와 파이프 연결할때, 그냥 청크에서 검색해서 버퍼스트림으로 받을땐 안씀
	        pic_id: options.pic_id,
	        chunks: options.chunks
	    };
	    async.waterfall([
	        function(callback) {
	            MongoClient.connect(options.connString, callback);
	        },
	        function(db, callback) {
	            context.db = db;
	            context.gfs = new Grid(db, mongo);
	            callback(null);
	        },
	        function(callback) {
	            var collection = context.db.collection(context.chunks);
	            collection.findOne({files_id: ObjectId.createFromHexString(objectIdString)}, callback);
	        }
	    ],
	    function(err, result) {
	        if (context.db){
	            context.db.close();
	        }
//	        console.log(result);
	        callback(err, result);
	    });	
	
};

//하단은 image만 파이프로 보내주는 코드
module.exports.getPicBuffer2 = function (objectIdString, options, callback) {
	var context = {
	        db: null,
	        gfs: null,
	        gfsOps: 0,
	        root: options.root,
	        writeStream: options.writeStream,
	        pic_id: options.pic_id
	    };
	    async.waterfall([
	        function(callback) {
	            MongoClient.connect(options.connString, callback);
	        },
	        function(db, callback) {
	            context.db = db;
	            context.gfs = new Grid(db, mongo);
	            callback(null);
	        },
	        function(callback) {
	        	//readStream
	        	var readStream = context.gfs.createReadStream({
	    			_id: ObjectId.createFromHexString(objectIdString),
	    			root:context.root
	    		});
//	        	console.log("r:",readStream);
	    		var writeStream = context.writeStream;	//res
	    		readStream.pipe(writeStream);	//read한 파일스트림을 res와 파이프 연결
	    		writeStream.on('close',function () {
	    			callback(null);
	    		});
	    		writeStream.on('error',function (error) {
	    			callback(error);
	    		});
	    		readStream.on('error',function (error) {
	    			callback(error);
	    		});
	        }
	    ],
	    function(err) {
	        if (context.db){
	            context.db.close();
	        }
	        callback(err);
	    });	
	
};

module.exports.saveRequest = function(req, options, callback) {
    var context = {
        db: null,
        gfs: null,
        gfsOps: 0,
        root: options.root,
        request: options.request
//        request: {
//            time: new Date()
//            // ...
//    		//options.request로 전달해서 request = options.request
//        }
    };
    async.waterfall([
        function(callback) {
            MongoClient.connect(options.connString, callback);
            //connString은==="mongodb://localhost/dongne"
        },
        function(db, callback) {
            context.db = db;
            context.gfs = Grid(db, mongo);
            callback(null);
        },
        function(callback) {
            var form = new multiparty.Form({
//            	maxFieldSize:8192, maxFields:10, autoFiles:false
            	maxFieldSize: config.multiparty.maxFiledSize, 
            	maxFields: config.multiparty.maxFields, 
            	autoFiles: config.multiparty.autoFiles
            });
            form.on("part", function(part) {
                if (!part.filename)
                {
                    callback(null);
                }
                var objectId = new ObjectId();                
                context.gfsOps++;
                var writeStream = context.gfs.createWriteStream({
                    mode: "w",
                    _id:objectId,
                    root:context.root,	//renamed by "root.chunks"
                    filename: part.filename,
                    content_type: part.headers["content-type"]
                });
                writeStream.on("close", function() {
                	context.request.pic.id = objectId;
                	context.request.pic.contentType = part.headers["content-type"];
                    context.gfsOps--;
                    if (context.gfsOps == 0)
                    {
                        callback(null);
                    }
                });
                
                part.pipe(writeStream);
            });
            form.on("field", function(name, value) {
                context.request[name] = value;
            });
            form.on("close", function() {
                if (context.gfsOps == 0)
                {
                    callback(null);
                }
            });
            form.parse(req);
        },
        function(callback)
        {
            var collection = context.db.collection("movies");
            collection.insert(context.request, callback);
        }
    ],
    function(err, result) {
        if (context.db){
            context.db.close();
        }
        console.log("result:", result);
        callback(err, result);
    });
}


//module.exports.router = function(options) {
//    var router = express.Router();    
//    router.post('/blargh', function(req, res) {
//        saveRequest(req, options, function(err) {
//            if (err)
//            {
//                res.writeHead(500);
//                res.end();
//            }
//            else
//            {
//                res.redirect("/");
//                res.end();
//            }    
//        });
//    });
//
//    return router;
//}