var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var connection = require('./mongodbConfig');

var ReportSchema = Schema({
	//ofObjectId: [Schema.Types.ObjectId],
	from: {type: Number, ref: 'User', required: true},
	to: {type: Number, ref: 'User', required: true},
	type: {type: Number, default: 0}, //각 신고사유
	actionUser: {type: Number, default: 0},	
	updatedAt: {type: Date, default: Date.now},
	msg: {type: String, default: ""}
});


//Composite Indexes 
//Generate Indexes in schema level
ReportSchema.index({ from: 1, to: 1 }, {unique:true});   
ReportSchema.index({ to: 1, from: 1 }, {unique:true}); 

var Report = mongoose.model('Report', ReportSchema);

module.exports = Report;

