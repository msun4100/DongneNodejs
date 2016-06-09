var passUtil = require('../passport/password'),
	q = require('q'),
	config = require('../config');
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var connection = require('./mongodbConfig');
autoIncrement.initialize(connection);

var UserSchema = Schema({
	userId: {type: Number, unique: true },
	email: {type: String, unique: true },
	password: String,
	pushId: String,
	username: String,
	univ: [{univId:Number, name:String, dept:String, enterYear:Number, isGraduate:{ type: Number, default: 0 }}],
	job: { name:String, team:String },
	desc: [ String ],
	sns: [ String ],
	pic: String,
	createdAt: { type: Date, default: Date.now },
	salt: {type: String},
	work: {type: Number},
	provider: {type: String}
	
	
//	friends:[ Number ],
	//ofObjectId: [Schema.Types.ObjectId],
//	rooms:[Number]
});

//var info = {
////		userId:
//		email: req.body.email,
//		password: req.body.password,
//		pushId: req.body.pushId,
//		username: req.body.username,
//		univ:[],
//		job: "tempJob",
//		desc:[],
//		sns:[],
//		pic: "temPicture",
////		salt:
//		work: config.crypto.workFactor,
//		provider: "local"
//};

UserSchema.statics.addUser = function(info, cb) {
	this.find({ email : info.email}, function(err, docs){
		if(err) 
			return cb(err, null);
		if(docs.length === 0){
			passUtil.passwordCreate(info.password, function(err, salt, password){
				user = new User({
					email: info.email,
					password: password, //생성된
					pushId: info.pushId,
					username: info.username,
					univ: info.univ,
					job: info.job,
					desc: info.desc,
					sns: info.sns,
					pic: info.pic,
					salt: salt,	//생성된
					work: info.work,
					provider: "local",
				});
				user.save(function(err){
					if(err) {
						console.log('addUser.save() error occured..');
						return cb(err, null);	//email dup error.code 11000
					}
					return cb(null, user);
				});
			});
		} else {
			return cb(new Error('User exists!'), null);
		}

	});
}

UserSchema.statics.updatePassword = function(email, password, work, cb){
	var schema = this;
	passUtil.passwordCreate(password, function(err, salt, password){
		schema.findOne({email: email}, function(err, profile){
			if(profile){
				profile.salt = salt;
				profile.password = password;
				profile.work = work;
				profile.save(function(err){
					if(err) return cb(err, null);
					return cb(null, profile);
				});
			}
		});
	});
};

UserSchema.statics.findByUsername = function findByUsername(username, cb){
	return this.findOne({username: username}, cb)
};

UserSchema.statics.findByEmail = function findByEmail(email, cb){
//	cb(null, User[username]);
	return this.findOne({email: email}, cb)
};

UserSchema.methods.addUniv = function(univ) {
	this.univ.push(univ);
	return this.save(); //promise객체로 리턴 됨
};
//static 은 User.xxx로 호출 method는  user = new User({}) --> user.xx 인스턴스로 호출
UserSchema.index({ "univ.name": 1, "univ.dept": 1 }); 

UserSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'userId', startAt: 0, incrementBy: 1});
var User = mongoose.model('User', UserSchema);

var findByUsername = function findByUsername(username, cb){
	cb(null, User[username]);
};

var addUser = function addUser(username, password, work, cb){
//	cb호출하면 로그인하거나 exist 에러 리턴
	User.find({	username : username}, function(err, docs){
		if(err) 
			return cb(err, null);
		if(docs.length === 0){
			passUtil.passwordCreate(password, function(err, salt, password){
				user = new User({
					username: username,
					salt: salt,
					password: password,
					work: work,
					provider: 'local',
				});
				user.save(function(err){
					return cb(null, user);
				});
			});
		} else return cb(new Error('docs Length error'), null);

	});
};

exports.findByUsername = findByUsername;
exports.addUser = addUser;

module.exports = User;

//dummy values
//setupUsers();
function setupUsers(){
	for(var i=0; i<1000; i++){
		createUser(i);
	}
}
function saveUser(user){
	user.save(function(err){
		if(err) {
			console.log('addUser.save() error occured..');
		}
		console.log(user.email+' saved');
	});
}

function createUser(i){
	passUtil.passwordCreate("1234", function(err, salt, password){
		user = new User({
			email: 'user'+i+'@gmail.com',
			password: password, //생성된
			pushId: "temppushid" +i,
			username: 'username'+i,
			univ: [],
			job: {},
			desc: [],
			sns: [],
			pic: [],
			salt: salt,	//생성된
			work: config.crypto.workFactor,
			provider: "local",
		});
		saveUser(user);
	});	
}

//function getUsersinRoom(room){
//	return q.Promise(function(resolve, reject, notify){
//		client.zrange('rooms:' + room, 0, -1, function(err, data){
//			var users = [];
//			var loopsleft = data.length;
//			data.forEach(function(u){
//				client.hgetall('user:' + u, function(err, userHash){
//					users.push(models.User(u, userHash.name, userHash.type));
//					loopsleft--;
//					if(loopsleft === 0) resolve(users);
//				});
//			});
//		});
//	});
//};

