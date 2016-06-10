var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var BoardSchema = new Schema({
    title: String,
    filename: String,
    updateAt: { type: Date, default: Date.now },
    commentId: Schema.Types.ObjectId
});
var Board = mongoose.model('Board', BoardSchema);

//exports.CommentThread = CommentThread;
module.exports = Board;