var BitMap = require('redis-bitmap')
  , redis = require('redis')
  , db = redis.createClient(6379
		  , 'ec2-52-78-76-64.ap-northeast-2.compute.amazonaws.com'
//		  , '127.0.0.1'
//		  , {detect_buffers: true}
  			, {return_buffers: true})
  , bmap = new BitMap(db);

//bmap.setbit('meow', 0, 1, redis.print) // 1 
//bmap.setbit('meow', 2, 1, redis.print) // 1 
//bmap.setbit('meow', 4, 1, redis.print) // 1 
// 
//bmap.setbit('bark', 1, 1, redis.print) // 1 
//bmap.setbit('bark', 2, 1, redis.print) // 1 
//bmap.setbit('bark', 7, 1, redis.print) // 1
//bmap.setbit('bark', 5002, 0, redis.print) // 1
//bmap.setbit('bark', 8, 0, redis.print) // 1
//bmap.get('meow', redis.print)          // 00010101 
//bmap.get('bark', redis.print)          // 10000110
//console.time('Time');
//bmap.get('bark', function(err, bitarray){
//	  var bits = bitarray.toJSON()       //  
//	  var binary = bitarray.toString()   //  
//	  var count = bitarray.cardinality() // 
////	  console.log(bits);
////	  console.log(binary);
//	  console.log("count", count);
//	  console.log("test", bits[0]);
//	  console.log("test", bits[1]);
//	  console.log("test", bits[2]);
//	  console.timeEnd('Time');
//	  
//})          // 10000110
////bmap.xor('meow', 'bark', redis.print)  // 10010011 
////bmap.or('meow', 'bark', redis.print)   // 10010111 
//bmap.and('meow', 'bark', redis.print)  // 00000100 
////bmap.not('meow', redis.print)          // 11101010 
////bmap.not('bark', redis.print)          // 01111001 



//=========================
var express = require('express'),
	router = express.Router();
var redis = require('redis');
//var JSON = require('JSON');
var client = redis.createClient(6379,'ec2-52-78-76-64.ap-northeast-2.compute.amazonaws.com');
 
//app.use(function(req, res, next){
//      req.cache = client;
//      next();
//})
//var mUtil = require('./middleware/utilities');
router.get('/bitmap', function(req,res,next){
	 console.time('bitmap');
	bmap.setbit('bark1', 1, 1, redis.print) // 1 
	bmap.setbit('bark1', 2, 1, redis.print) // 1 
	bmap.setbit('bark1', 7, 1, redis.print) // 1
	bmap.setbit('bark1', 6, 1, redis.print) // 1
	bmap.setbit('bark1', 8, 1, redis.print) // 1
//	bmap.setbit('bark1', 150002, 1, redis.print) // 1
	bmap.get('bark1', function(err, bitarray){
		  var bits = bitarray.toJSON()       //  
		  var binary = bitarray.toString()   //  
		  var count = bitarray.cardinality() // 
//		  console.log(bits);	//like an array
//		  console.log(binary); 
//		  console.log(count);
		  console.log("test", bits[0]);
		  console.log("test", bits[1]);
		  console.log("test", bits[2]);
		  console.timeEnd('bitmap');
		  res.send({error: false, message:count});
	});
});
router.post('/profile',function(req,res,next){
//      req.accepts('application/json');
      console.time("profile");
      var key = req.body.name;
      var value = JSON.stringify(req.body);
     
      req.cache.set(key, value, function(err,data){
           if(err){
                 console.log(err);
                 res.send("error "+err);
                 return;
           }
           req.cache.expire(key, 30);	//30초 뒤 삭제
           res.send(value);
           console.log(value);
           console.timeEnd("profile");
      });
});
router.get('/profile/:name',function(req,res,next){
      var key = req.params.name;
     
      req.cache.get(key,function(err,data){
           if(err){
                 console.log(err);
                 res.send("error "+err);
                 return;
           }
 
           var value = JSON.parse(data);
           res.send(value);
      });
});

module.exports = router;