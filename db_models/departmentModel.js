var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var DepartmentSchema = Schema({
	deptId: {type: Number, unique: true},
	univId: {type: Number, ref: 'University', required: true},
	deptname: {type: String, required: true},
	createdAt: {type: Date, default: Date.now},
	updatedAt: {type: Date, default: Date.now},
	total:{type: Number, default: 0}
});

DepartmentSchema.index({ univId: 1, deptname: 1 }, {unique:true}); 

DepartmentSchema.plugin(autoIncrement.plugin, { model: 'Department', field: 'deptId', startAt: 0, incrementBy: 1});
var Department = mongoose.model('Department', DepartmentSchema);

module.exports = Department;

//Department.create({univId:0, deptname: "컴퓨터공학"}).then(function fulfilled(result) {}, function rejected(err) {});
//Department.create({univId:0, deptname: "호텔경영학과"}).then(function fulfilled(result) {}, function rejected(err) {});
//Department.create({univId:1, deptname: "컴퓨터공학"}).then(function fulfilled(result) {}, function rejected(err) {});
//Department.create({univId:1, deptname: "호텔관광경영학부"}).then(function fulfilled(result) {}, function rejected(err) {});
//Department.create({univId:1, deptname: "호텔경영학과"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
//Department.create({univId:1, deptname: "호텔경영학과"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });