var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var BoardSchema = new Schema({
	univId: {type: Number, ref: 'Univ'},
	writer: {type: Number, ref: 'User'},	//User.userId
	pageId: {type: Number, ref: 'Page'},	//0:재학생, 1:졸업생, 2:~page#
	type: {type: Number, "default": 1},	//0:비공개, 1:공개
    title: String,
    
    body: {type: String, "default": "내용을 입력해주세요."},
    viewCount: {type: Number, "default": 0},
    likeCount: {type: Number, "default": 0},
    likes: [{type: Number, ref: 'User'}],
    filename: String,
    createdAt: { type: Date, "default": Date.now },
    updatedAt: { type: Date, "default": Date.now },
    commentId: { type: Schema.Types.ObjectId, ref: 'CommentThread'}
});

BoardSchema.virtual('mDate').get(function () {
	return formatDate(this.createdAt);
});
BoardSchema.set('toJSON' , { virtuals : true});

BoardSchema.plugin(autoIncrement.plugin,
		  { "model" : 'Board' , "field" : 'boardId', "startAt" : 0, "incrementBy" : 1});

var Board = mongoose.model('Board', BoardSchema);

//exports.CommentThread = CommentThread;
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