var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var ReplySchema = new Schema();
ReplySchema.add({
	username: String,
	subject: String,
	timestamp: { type: Date, default: Date.now },
	body: String,
	replies:[ReplySchema]
});
var CommentThreadSchema = new Schema({
    title: String,
//    postId: Schema.Types.ObjectId,
    postId: Number,
    replies:[ReplySchema]
});

//CommentThreadSchema.statics.getComment = function(req, res, next) {
//	this.findOne({ _id: req.query.commentId })
//	.exec(function(err, comment) {
//		if (!comment){
//			res.send({success: 0, msg:'CommentThread Not Found.', result: null});
//	    } else {
//	    	res.send({success: 1, msg:'CommentThread Found.', result: comment});
//	    }
//	});
//};

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