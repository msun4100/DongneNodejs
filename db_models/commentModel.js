var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var ReplySchema = new Schema();
ReplySchema.add({
	username: {type: String, required: true, default: "익명"},
	userId: {type: Number, ref: 'User', required: true},
	updatedAt: { type: Date, 'default': Date.now },
	type: {type: String, "default": "01"},	//00:재학생/비공개, 01:재학생/공개, 10:졸업생/비공해, 11:졸업생/공개
	body: {type: String, required: true},
	replies:[ReplySchema],
	likeCount: {type: Number, default: 0 },
	likes: [{type: Number, ref: 'User'}]
});
var CommentThreadSchema = new Schema({
    title: String,
//    postId: Schema.Types.ObjectId,
    boardId: {type: Number, ref: 'Board', required: true},
    updatedAt: { type: Date, 'default': Date.now },
    replies:[ReplySchema]
//    replies: [{ type: Schema.Types.ObjectId, ref: 'Reply' }]
});

//CommentThreadSchema.statics.findOne = function(id, cb) {
//	return this.findOne({_id: id}, cb);
//};

//mongoose.model('Reply', ReplySchema);
//mongoose.model('CommentThread', CommentThreadSchema);

var Reply = mongoose.model('Reply', ReplySchema);
var CommentThread = mongoose.model('CommentThread', CommentThreadSchema);

exports.Reply = Reply;
exports.CommentThread = CommentThread;
//module.exports = Reply;
//module.exports = CommentThread;