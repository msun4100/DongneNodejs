var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);


var PageSchema = new Schema({
//  writer: Number,	//User.userId
	admin: [{type: Number, ref: 'User'}],
	univId: {type: Number, ref: 'Univ'},
	
	pageId: Number,	//0:재학생, 1:졸업생, 2:~page#
	pagename: String,
	type: {type: Number, "default": 1},	//0:비공개, 1:공개

    followers: [{type: Number, ref: 'User'}],
    requests: [{type: Number, ref: 'User'}],
    fCount: {type: Number, "default":0},
    rCount: {type: Number, "default":0},
    createdAt: { type: Date, "default": Date.now },
    updatedAt: { type: Date, "default": Date.now },
});

PageSchema.index({ univId: 1, pagename: 1 }, {unique:true});  

//PageSchema.statics.findByPageId = function findByPageId(pageId, cb) {
//	return this.findOne({pageId: pageId}, cb);
//};
PageSchema.statics.findByPageId = function findByPageId(pageId, cb) {
	return this.findOne({pageId: pageId}, cb);
};

PageSchema.plugin(autoIncrement.plugin,
		  { "model" : 'Page' , "field" : 'pageId', "startAt" : 0, "incrementBy" : 1});

var Page = mongoose.model('Page', PageSchema);
Page.prototype.inArray = function(value) {
	// Returns true if the passed value is found in the array. Returns false if it is not.
	var i;
	for (i = 0; i < this.followers.length; i++) {
		console.log("this.followers["+i+"]", this.followers[i]);
		if (this.followers[i] === value) {
			return true;
		}
	}
	return false;
};


module.exports = Page;