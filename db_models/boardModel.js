var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
	ObjectID = require('mongodb').ObjectID;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var BoardSchema = new Schema({
	univId: {type: Number, ref: 'Univ', required: true},
	writer: {type: Number, ref: 'User', required: true},	//User.userId
	pageId: {type: Number, ref: 'Page'},	//0:재학생, 1:졸업생, 2:~page#
	type: {type: String, "default": "01"},	//00:재학생/비공개, 01:재학생/공개, 10:졸업생/비공해, 11:졸업생/공개
    title: String,
    
    body: {type: String, "default": "내용을 입력해주세요."},
    viewCount: {type: Number, "default": 0},
    likeCount: {type: Number, "default": 0},
    likes: [{type: Number, ref: 'User'}],
    pic: [String],
    createdAt: { type: Date, "default": Date.now },
    updatedAt: { type: Date, "default": Date.now },
    commentId: { type: Schema.Types.ObjectId, ref: 'CommentThread'},
    user: { 
    	pic: {small: {type: String, default: ""}, large: {type: String, default: ""}}, 
    	username: {type: String, default: "name"}, 
    	enterYear: {type: Number, default: 2000},
    	deptname: {type: String, default: "deptname"}
    },
    preReplies:[]	//변수만 설정. 이렇게 안만들어 놓으면 안붙음.
});

//BoardSchema.virtual('mDate').get(function () {
//	return formatDate(this.createdAt);
//});
//아래 주석하면 포맷 변환한 mDate 전송 안됨.. 근데 왜 id 필드가 리스폰스 되는거지
//BoardSchema.set('toJSON' , { virtuals : true});

BoardSchema.plugin(autoIncrement.plugin,
		  { "model" : 'Board' , "field" : 'boardId', "startAt" : 0, "incrementBy" : 1});

var Board = mongoose.model('Board', BoardSchema);

//exports.CommentThread = CommentThread;
//function formatDate (date) {
//	var y = date.getFullYear();
//	var m = date.getMonth() + 1;  // 0부터 시작
//	var d = date.getDay();
//
//	var h = date.getHours();
//	var i = date.getMinutes();
//	var s = date.getSeconds();
//
//	// YYYY-MM-DD hh:mm:ss
//	var today = (m > 9 ? m : "0" + m) + '/' + (d > 9 ? d : "0" + d) ;
//
//	return today;
//}
function formatDate (date) {
	var y = date.getFullYear();
	var m = date.getMonth() + 1;  // 0부터 시작
	var d = date.getDay();

	var h = date.getHours();
	var i = date.getMinutes();
	var s = date.getSeconds();

	// YYYY-MM-DD hh:mm:ss
	var today = y + '-' + (m > 9 ? m : "0" + m) + '-' + (d > 9 ? d : "0" + d) + ' ' +
	            (h > 9 ? h : "0" + h) + ":" + (i > 9 ? i : "0" + i) + ":" + (s > 9 ? s : "0" + s);

	return today;
}

module.exports = Board;