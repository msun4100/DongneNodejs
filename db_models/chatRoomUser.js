var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
	ObjectID = require('mongodb').ObjectID;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var ChatRoomUserSchema = new Schema({
	chat_room_id: {type: Number, required: true},
	name: {type: String, "default": "채팅방", required: true},
	host: {type: Number, ref: 'User', required: true},
	users: [{type: Number, ref: 'User'}],
    createdAt: { type: Date, "default": Date.now },
    updatedAt: { type: Date, "default": Date.now },

});

ChatRoomUserSchema.index({ "chat_room_id": 1 }); 

var ChatRoomUser = mongoose.model('ChatRoomUser', ChatRoomUserSchema);

module.exports = ChatRoomUser;