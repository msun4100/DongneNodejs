/**
 * This class prepares the required JSON format that is transferred as a push message to device. 
 * If you want to add additional fields to json, you need to add them in this class.
 */
var Push = function(title, data, is_background, flag){
	this.title = title;
	this.data = data;
	this.is_background = is_background;
	this.flag = flag;
};
//var Push = {
//	title: String,	
//};
Push.prototype = {
	funcXXX: function(){
		return 'funcXXX Stream';
	},
	getPush: function(){
		var res = {};
		return 'funcXXX Stream';
	}
};

//Push.prototype.funcXXX = function(){
//	return 'funcXXX Stream';
//};
//Push.prototype.getPush = function(){
//	var res = {};
//	return 'funcXXX Stream';
//};

module.exports = Push;