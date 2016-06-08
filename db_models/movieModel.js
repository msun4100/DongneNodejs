//다른 디비에 추가로 연결할 때
//var mongoose = require('mongoose');
//var dbURI = 'mongodb://localhost/dongne';
////mongoose.createConnection(dbURI,{ server: { poolSize:10 } });
//mongoose.connect(dbURI);
//var conn = mongoose.connection;
//
//conn.on('error', function(err) {
//   console.error('Error : ', err);
//});
////conn.on('open', function() {
////   console.log('Connection open');
////});
//conn.on('connected', function() {
//	   console.log('connected..'+ conn);
//});
//conn.on('disconnected', function() {
//	   console.log('disconnected..');
//});
//process.on('SIGINT', function() {
//	mongoose.connection.close(function() {
//		console.log('Application process is going down, disconnect database connection...');
//		process.exit(0);
//	});
//});
//====================================

//=============================================================
var mongoose = require('mongoose');
//var conn = require('./mongodbConfig');

var MovieSchema = mongoose.Schema({
   title : String,
   director : String,
   year : Number,
   poster : String,
   reviews : [String]
});

MovieSchema.methods.addReview = function(review) {
   this.reviews.push(review);
   return this.save();	//promise객체로 리턴 됨
};

var Movie = mongoose.model('Movie', MovieSchema);

module.exports = Movie;

// var movie1 = new Movie({title:'인터스텔라', director:'크리스노퍼 놀란', year:2014, poster:'/images/Avata.jpg'});
// movie1.save(function(err, result, rows) {
//    if ( err ) {
//       console.error('Error : ', err);      
//    }
//    else {
//       console.log('Success');
//    }
// });
//
// Movie.create({title:'아바타', director:'제임스 카메론', year:2010}).then(function fulfilled(result){
//    console.log('Success : ', result);
// }, function rejected(err) {
//    console.error('Error : ', err);
// });
//
// Movie.create({title:'스타워즈', director:'조지 루카스', year:1977}, function(err, result) {
//    if ( err ) {
//       console.error('Error : ', err);
//    }
//    else {
//       console.log('Success : ', result);
//    }
// });