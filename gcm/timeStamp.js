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

function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}

	// var y = date.getFullYear();
	// var m = date.getMonth() + 1;  // 0부터 시작
	// var d = date.getDay();

	// var h = date.getHours();
	// var i = date.getMinutes();
	// var s = date.getSeconds();

	// // YYYY-MM-DD hh:mm:ss
	// var today = y + '-' + (m > 9 ? m : "0" + m) + '-' + (d > 9 ? d : "0" + d) + ' ' +
	//             (h > 9 ? h : "0" + h) + ":" + (i > 9 ? i : "0" + i) + ":" + (s > 9 ? s : "0" + s);


module.exports.getCurrentTimeStamp = function() {
	var d = new Date(),

	dformat = [d.getFullYear(),
				(d.getMonth()+1 > 9 ? d.getMonth()+1 : "0" + d.getMonth()+1),
				(d.getDate() > 9 ? d.getDate() : "0" + d.getDate()) ].join('-')+'T'+
			  [(d.getHours() > 9 ? d.getHours() : "0" + d.getHours()),
	           (d.getMinutes() > 9 ? d.getMinutes() : "0" + d.getMinutes()),
	           (d.getSeconds() > 9 ? d.getSeconds() : "0" + d.getSeconds())].join(':')+'.'+
				(d.getMilliseconds() > 9 ? (d.getMilliseconds() > 99 ? d.getMilliseconds() : "0"+d.getMilliseconds()) : "00" + d.getMilliseconds())
			   +'Z';

//	dformat = [d.getFullYear(),
//	           d.getMonth()+1,
//	           d.getDate() ].join('-')+' '+
//	          [d.getHours(),
//	           d.getMinutes(),
//	           d.getSeconds()].join(':');
			   
	return dformat;	
};


