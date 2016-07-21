//=> dformat => '2016-7-1 10:52:21'
//07-01 처럼 할거면 padLeft 구글 검색
//var TimeStamp = function(){
//	
//};
//TimeStamp.prototype = {
//		getCurrentTimeStamp: function(){
//			var d = new Date,
//			dformat = [d.getFullYear(),
//			           d.getMonth()+1,
//			           d.getDate() ].join('-')+' '+
//			          [d.getHours(),
//			           d.getMinutes(),
//			           d.getSeconds()].join(':');
//			return dformat;
//		}
//};
//
//module.exports.TimeStamp = new TimeStamp();

module.exports.getCurrentTimeStamp = function() {
	var d = new Date(),
	dformat = [d.getFullYear(),
	           d.getMonth()+1,
	           d.getDate() ].join('-')+' '+
	          [d.getHours(),
	           d.getMinutes(),
	           d.getSeconds()].join(':');
//	console.log("timeStamp.js->dfotmat:", dformat);
	return dformat;	
};