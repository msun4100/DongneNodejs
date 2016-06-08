var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var CompanySchema = Schema({
	compId: {type: Number, unique: true},
	compname: {type:String, unique: true},
	createdAt: {type: Date, default: Date.now},
	updatedAt: {type: Date, default: Date.now},
	total:{type: Number, default: 0}
});

CompanySchema.plugin(autoIncrement.plugin, { model: 'Company', field: 'compId', startAt: 0, incrementBy: 1});
var Company = mongoose.model('Company', CompanySchema);

module.exports = Company;