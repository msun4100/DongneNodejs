var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var UniversitySchema = Schema({
	//ofObjectId: [Schema.Types.ObjectId],
	univId: {type: Number, unique: true},
	univname: {type: String, unique: true},
	createdAt: {type: Date, default: Date.now},
	updatedAt: {type: Date, default: Date.now},
	total:{type: Number, default: 0}
});


//Compound Indexes 
//Generate Indexes in schema level
//UniversitySchema.index({ from: 1, to: 1 }, {unique:true});   

UniversitySchema.plugin(autoIncrement.plugin, { model: 'University', field: 'univId', startAt: 0, incrementBy: 1});
var University = mongoose.model('University', UniversitySchema);

module.exports = University;

//University.create({univId:0, univname: "인하대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:1, univname: "세종대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:2, univname: "서울대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:3, univname: "연세대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:4, univname: "고려대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:5, univname: "중앙대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:6, univname: "성균관대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:7, univname: "홍익대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
//University.create({univId:8, univname: "서강대학교"}).then(function fulfilled(result) {}, function rejected(err) {});