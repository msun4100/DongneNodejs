var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var ReplySchema = new Schema();
ReplySchema.add({
	username: String,
	userId: Number,
	timestamp: { type: Date, 'default': Date.now },
	body: String,
	replies:[ReplySchema],
	likeCount: Number,
	likes: [{type: Number, default: 0}]
});
var CommentThreadSchema = new Schema({
    title: String,
//    postId: Schema.Types.ObjectId,
    boardId: {type: Schema.Types.ObjectId, ref: 'Board'},
    updateAt: { type: Date, 'default': Date.now },
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