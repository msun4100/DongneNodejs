var express = require('express'),
	router = express.Router(),
	async = require('async'),
	mUtil = require('../middleware/utilities');

var User = require('../db_models/userModel'),
	Friend = require('../db_models/friendModel');

var gpsProvider = require('../gpsProvider')();
var config = require('../config'),
	request = require('request'),
	passwordUtils = require('../passport/password'),
	log = require('../middleware/log');

var GeoNear = require('../geoNear');
router.get('/users/:userId', getUser);
router.post('/users/email', emailCheck);
router.put('/users', editUser);
router.put('/users/pw', editPassword);
router.get('/geoNear', geoNearTest);
function geoNearTest(req, res, next){
	GeoNear.locationsListByDistance(req, res);
}

function getUser(req, res, next) {
	var userId = req.params.userId;
	var user = req.user;
	if (!userId) {
		res.send({ error: true, message: 'params undefined error' });
	}
	if (!user) {
		res.send({ error: true, message: 'user session undefined error' });
	}
	User.find({ "userId": userId }, { _id: 0, password: 0, salt: 0, work: 0, __v: 0, "univ._id": 0 })
		.then(function fulfilled(docs) {
			// console.log(docs);
			// console.log(docs.length);
			if (docs && docs.length === 1) {
				async.waterfall([
					function (callback) {
						//find accepted friends and fetch isFriend
						var query = Friend.find();
						query.or([{ from: user.userId, to: userId }, { from: userId, to: user.userId }])
						query.select({ __v: 0, _id: 0 });
						query.exec().then(function fulfilled(result) {
							if (result && result.length === 1) {
								docs[0].status = result[0].status;
								docs[0].isFriend = true;
							} else {
								docs[0].status = -1;
								docs[0].isFriend = false;								
							}
							callback(null, docs);
						}, function rejected(err) {
							callback(err, null);
						});
					},
					function (users, callback) {
						var locObj = {
							lat: user.location.coordinates[1],
							lon: user.location.coordinates[0]
						} 
						fetchDistance(locObj, users, function (err, list) {	//user.location
							if (err) callback(err, null);
							else callback(null, list);
						});
					}],
					function (err, list) {
						if (err) { res.send({ error: true, message: err.message }); }
						else {
							res.send({ error: false, message: 'Succeed to get user ' + userId + ' info', result: list });
						}
					});
			} else {	//length error
				res.send({ error: true, message: 'User ' + userId + ' Not Found' + ', length:' + docs.length });
			}
		}, function rejected(err) {	//User query on error
			res.send({ error: true, message: 'FIND_USER_ERROR' });
		});

}

function editPassword(req, res, next) {
	var email = req.body.email;
	var password = req.body.password;
	var value = req.body.value;	//바꿀 비번
	if (!email || !password || !value) { return res.send({ error: true, message: 'args undefined error' }); }
	User.findOne({ email: email }, function (err, profile) {
		if (profile) {
			passwordUtils.passwordCheck(password, profile.password, profile.salt, profile.work, function (err, isAuth) {
				if (isAuth) {
					User.updatePassword(email, value, config.crypto.workFactor, function (err, profile) {
						profile.updatedAt = Date.now();
						profile.save().then(function fulfilled(result) {
							//							console.log('password Changed on workFactor');
							return res.send({ error: false, message: 'PW successfully changed' });
						}, function rejected(err) {
							log.debug({ message: 'PW Change callback error', pushId: req.body.pushId });
							return res.send({ error: true, message: 'PW change callback error' });
						});
					});
				} else {
					log.debug({ message: 'Wrong Username or Password', username: email });
					return res.send({ error: true, message: 'Email or Password' });
				}
			});
		} else {
			return res.send({ error: true, message: 'Email or Password' });
		}
	});
}


function editUser(req, res, next) {
	var reqDate = req.body.reqDate;
	var email = req.body.email;
	var deptname = req.body.deptname;
	if (!email || !deptname) {
		return res.send({ error: true, message: 'email or deptname undefined error' });
	}
	var desc1 = req.body.desc1;
	var desc2 = req.body.desc2;
	var jobname = req.body.jobname;
	var jobteam = req.body.jobteam;
	var fb = req.body.fb;
	var insta = req.body.insta;
	console.log("req.body", req.body);
	if (jobname && jobname === "") {
		console.log("equals", "empty");
	}
	if (jobname && jobname.length === 0) {
		console.log("equals", "0");
	}
	User.findByEmail(email, function (err, doc) {
		if (err) {
			err.code = 500;
			return next(err);
		}
		if (!doc) {
			return res.send({ error: true, message: 'email not exists' });
		}
		if (deptname) {
			doc.univ[0].deptname = deptname;
		}
		if (desc1) {
			doc.desc = [];
			doc.desc.push(desc1);
		}
		if (desc2) {
			if (!desc1) { doc.desc = []; }
			doc.desc.push(desc2);
		}
		if (jobname || jobname === "") {
			doc.job.name = jobname;
		}
		if (jobteam || jobteam === "") {
			doc.job.team = jobteam;
		}
		if (fb) {
			doc.sns = [];
			var info = { url: fb, sns: "fb" };
			doc.sns.push(info);
		}
		if (insta) {
			if (!fb) { doc.sns = []; }
			var info2 = { url: insta, sns: "insta" };
			doc.sns.push(info2);
		}
		if(reqDate){
			var d = new Date(reqDate);
			// console.log("dddd", d);
			doc.updatedAt = d;
		} else {
			doc.updatedAt = Date.now();
		}
		
		doc.save().then(function fulfilled(result) {
			res.send({
				error: false,
				message: 'user info has Successfully edited',
				//				result: [result]
			});
		}, function rejected(err) {
			res.send({
				error: true,
				message: 'An error occurred while user info editing'
			});
		});
	});
}
function emailCheck(req, res, next) {
	var email = req.body.email;
	User.find({ "email": email }, { _id: 1, userId: 1, email: 1, createdAt:1, provider: 1 }).then(function fulfilled(docs) {
		if (docs.length > 0) {
			res.send({ error: false, message: 'DUP_EMAIL', result: {userId: docs[0].userId, email:docs[0].email, created_at: docs[0].createdAt, provider: docs[0].provider} });
		} else {
			res.send({ error: false, message: 'AVAILABLE_EMAIL' });
		}
	}, function rejected(err) {
		res.send({ error: true, message: 'FIND_EMAIL_ERROR' });
	});
};

function fetchDistance(refPoint, users, cb) {

	var defaultValue = config.geoNear.defaultMsg;
	var list = [];
	var i, sum = 0;
	if (refPoint.lat === undefined || refPoint.lon === undefined || refPoint.lat === 99999 || refPoint.lon === 99999 || refPoint.lat === "" || refPoint.lon === "") {
		for (i = 0; i < users.length; i++) {
			users[i].temp = defaultValue;
			list.push(users[i]);
		}
	} else {
		for (i = 0; i < users.length; i++) {
			if (users[i].location.coordinates[1] === undefined || users[i].location.coordinates[0] === undefined || users[i].location.coordinates[1] === 0 || users[i].location.coordinates[0] === 0) {
				users[i].temp = defaultValue;
			} else {
				users[i].temp = gpsProvider.getDistance(refPoint.lat, refPoint.lon, users[i].location.coordinates[1], users[i].location.coordinates[0]);
			}
			list.push(users[i]);
		}
	}
	return cb(null, list);
}

var pool = require('../db_models/dbConfig');
router.get('/users/test', function(req,res){
	pool.getConnection(function (err, conn) {
			if (err) {
				console.log("1", err); 
				res.send(err); 
			}
			var sql = 'SELECT user_id, name, email, gcm_registration_id, created_at FROM users WHERE user_id = ?';
			var input = ""+7;
			conn.query(sql, input, function (err, results) {
				if (err) {
					conn.release();
					console.log("2", err);
					return res.send(err);
				}
				res.send(results);
				
			});
		});
});

module.exports = router;
