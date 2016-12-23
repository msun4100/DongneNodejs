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
	email: {type: String,
		required: true,
		unique: true,
		validate: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}\b/ },
	password: {type: String, required: true},
	pushId: String,
	username: String,
	univ: [{univId:{type: Number, ref: 'University'}, deptId:{type: Number, ref: 'Department'}, deptname:{type: String, default: "학교사람들"}, enterYear:{type: Number, default: 2016}, isGraduate:{ type: Number, default: 0 }}],
	job: { name:{type: String, default: ""}, team: {type: String, default: ""} },
	desc: [ String ],
	sns: [ { sns:{type: String, default: ""}, url: {type: String, default: ""} } ],
	pic: {
		small:{type: String, default: "0"},
//		medium:{type: String, default: ""},
		large:{type: String, default: "0"},
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	salt: {type: String},
	work: {type: Number},
	provider: {type: String},
	// location: { lat:{type: Number, default: 99999}, lon: {type: Number, default: 99999} },
	//   "location": {
    //       "type": "Point",
    //       "coordinates": [
    //         129.0393302,
    //         35.1144951
    //       ]
	//   }
	location: { "type": {type: String, default: "Point"}, "coordinates": []},
	//for response
	temp: {type: String, default: ""},
	status: {type: Number, default: -1},
	isFriend: {type: Boolean, default: false}
	
//	friends:[ Number ],
	//ofObjectId: [Schema.Types.ObjectId],
//	rooms:[Number]
});


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
					location: info.location
				});
				user.save(function(err){
					if(err) {
						console.log('addUser.save() error occured..::'+err);
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
UserSchema.index({ "univ.univId": 1, "univ.deptId": 1 });
UserSchema.index({ "location": "2dsphere" }); 

UserSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'userId', startAt: 1, incrementBy: 1});
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
var Dept = require('./departmentModel');

//setupUsers();
function setupUsers(){
	for(var i=0; i<5000; i++){
		createUser(i);
	}
}
function saveUser(user){
	user.save(function(err){
		if(err) {
			console.log('addUser.save() error occured..' + err.message);
		} else {
			console.log(user.email+' saved');	
		}
		
	});
}
//금촌역 lat1=37.7661170, lon1 =126.7745364;	//금촌역	
//인하대 후문 lat2=37.4519850, lon2 =126.6579650;	//인하대 후문
//신촌역x=126.936846&y=37.5552192&enc=b64
//홍대입구x=126.9271257&y=37.5573934&enc=b64
//부산역x=129.0393302&y=35.1144951&enc=b64
var location = [{lat:"37.7661170", lon:"126.7745364"},
                {lat:"37.4519850", lon:"126.6579650"},
                {lat:"37.5552192", lon:"126.936846"},
                {lat:"37.5573934", lon:"126.9271257"},
                {lat:"35.1144951", lon:"129.0393302"}]; //문자열로 넣어도 넘버로 자동컨버팅 되는 듯

var year = [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016];
function createUser(i){
	var r = Math.floor(Math.random()* 19 ); //19 is depts.length
	Dept.find({deptId: r}, function(err, doc){
		passUtil.passwordCreate("1234", function(err, salt, password){
			user = new User({
				email: 'user'+i+'@gmail.com',
				password: password, //생성된
				pushId: "temppushid" +i,
				username: 'username'+i,
//				univ: [{univId: Math.floor(Math.random()* 8 ), deptId: Math.floor(Math.random()* 11 ), deptname: "", enterYear: year[Math.floor(Math.random()* 9)], isGraduate: Math.floor(Math.random()* 2)}],
				univ: [{univId: doc[0].univId, deptId: doc[0].deptId, deptname: doc[0].deptname, enterYear: year[Math.floor(Math.random()* 9)], isGraduate: Math.floor(Math.random()* 2)}],
				job: { team: "jobteam"+ i, name: "jobname"+i},
				desc: [],
				sns: [{sns:"fb", url:"fb_url....."}],
				pic: {small: "", large: ""},
				salt: salt,	//생성된
				work: config.crypto.workFactor,
				provider: "local",
				location: location[Math.floor(Math.random()* 5 )]
			});
			saveUser(user);
		});	
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

