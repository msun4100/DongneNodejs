var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var connection = require('./mongodbConfig');

var FriendSchema = Schema({
	//ofObjectId: [Schema.Types.ObjectId],
	from: {type: Number, ref: 'User', required: true},
	to: {type: Number, ref: 'User', required: true},
	//cancel: -1(요청취소 또는 친구리스트에서 아무 관계가 아님을 표시하는 값), pending:0, accepted:1, declined:2, blocked:3
	status: {type: Number, default: 0},	 
	actionUser: {type: Number, default: 0},	
	updatedAt: {type: Date, default: Date.now},
	msg: {type: String, default: ""}
});


//Composite Indexes 
//Generate Indexes in schema level
FriendSchema.index({ from: 1, to: 1 }, {unique:true});   
FriendSchema.index({ to: 1, from: 1 }, {unique:true}); 

FriendSchema.methods.updateStatus = function(status, actionUserId) {
	var isSuccess = false;
	if(status < 4){
		this.status = status;
		this.actionUser = actionUserId;
	} 
	this.save().then(function fulfilled(result) {
		isSuccess = true;
    }, function rejected(err) {
       isSuccess = false;
    });
	return isSuccess;
}

FriendSchema.methods.showFriends = function(status, actionUserId) {
	
}

var Friend = mongoose.model('Friend', FriendSchema);

module.exports = Friend;


//dummy values
//for (i = 0; i < 10; i++) {
//	Friend.create({
//		from:1,
//		to:i,
//		actionUser:1
//	}).then(function fulfilled(result) {
//		if(result.to > 5){
//			result.status = 1;
//			if(result.updateStatus(1, 1)){
//				console.log('Success : ', result);				
//			}
//		}
////		console.log('Success : ', result);
//	}, function rejected(err) {
//		console.error('Error : ', err);
//	});
//	Friend.create({
//		from:3,
//		to:i,
//		actionUser:1
//	}).then(function fulfilled(result) {
//		if(result.to > 5){
//			result.status = 1;
//			if(result.updateStatus(1, 1)){
//				console.log('Success : ', result);				
//			}
//		}
////		console.log('Success : ', result);
//	}, function rejected(err) {
//		console.error('Error : ', err);
//	});
//}

