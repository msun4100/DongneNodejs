var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var PageSchema = new Schema({
//  writer: Number,	//User.userId
	admin: [{ type: Number }],
	univId: Number,
	
	pageId: Number,	//0:재학생, 1:졸업생, 2:~page#
	pagename: String,
	type: {type: Number, default: 1},	//0:비공개, 1:공개

    followers: [{type: Number}],
    requests: [{type: Number}],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

PageSchema.index({ univId: 1, pageId: 1 }, {unique:true});  

PageSchema.statics.findByPageId = function findByPageId(pageId, cb) {
	return this.findOne({pageId: pageId}, cb);
};

//UserSchema.statics.findByUsername = function findByUsername(username, cb){
//	return this.findOne({username: username}, cb)
//};

var Page = mongoose.model('Page', PageSchema);

module.exports = Page;