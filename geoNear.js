var User = require('./db_models/userModel')
	, Friend = require('./db_models/friendModel');

var meterConversion = (function() {
    var mToKm = function(distance) {
        return parseFloat(distance / 1000);
    };
    var kmToM = function(distance) {
        return parseFloat(distance * 1000);
    };
    return {
        mToKm : mToKm,
        kmToM : kmToM
    };
})();

//format to xx m or xx km
function showDistance(dist) {
	var distance = dist;
	if (dist < 1.0000000000000000) { // 자릿수 맞춤
		distance *= 1000;
		distance = distance.toFixed(0);
		distance += "m";
	} else {
		distance = distance.toFixed(1);
		distance += "km";
	}
	return distance;
}

/* GET list of locations */
module.exports.locationsListByDistance = function(req, res) {
    var maxDistance = 20000 * 1000; //=== 20000km
    var minDistance = 1;	//1m
	var user = req.user;
	if(!user){
        res.send({error: true, message : "req.user undefined error"});
        return;		
	}
//	var lng = 126.9271257;
//	var lat = 37.5573934;
	var lng = parseFloat(user.location.coordinates[0]);
	var lat = parseFloat(user.location.coordinates[1]);
	var userId = user.userId; //user.userId
	var univId = parseInt(req.params.univId);
	var start = parseInt(req.body.start);
	var display = parseInt(req.body.display);
    if ((!lng && lng !== 0) || (!lat && lat !== 0) || !univId ||!req.body.start || !req.body.display) {
        console.log('locationsListByDistance missing params');
        res.send({error: true, message: "lng, lat, start and display query parameters are all required"});
        return;
    }
    User.aggregate(
    [
    {
    	"$geoNear":{
    		"near": {
    			"type": "Point",
    			"coordinates": [lng, lat]
    		},
    		"spherical": true,
    		"distanceField": "temp",	//"dis" 라고 쓰면 새로운 임시 필드 dis가 생성
    		"maxDistance": maxDistance,
            "minDistance": minDistance,
//            "num": 10	//aggregate option의 limit으로 대체
    	}
    },
    
    {"$match": { "userId": { "$ne": user.userId }, "univ.univId": univId }},
    {"$project": { userId:1, email:1, pushId:1, username:1, provider:1, isFriend:1, temp: 1, status:1, location:1, updatedAt:1, createdAt:1, pic:1, sns:1, desc:1, job:1, univ:1}},
    {"$sort": {"username": 1}},
    {"$skip": start * display },
    {"$limit": display }	
    ], function(err, users){
    	var locations;
    	if (err) {
    		console.log('geoNear error:', err.message);
    		res.send({error: true, message: err.message});
    	} else {
    		if(!users || users.length === 0){
    			res.send({error: true, message: 'aggregated lists undefined error'});
    			return;
    		}
			var query = Friend.find();
			query.or([{ from: user.userId }, { to: user.userId }]);
			query.select({ __v: 0, _id: 0 });
			query.exec().then(function fulfilled(results) {
				var ids = [];
				var status = [];
				var i, j;
				for (i = 0; i < results.length; i++) {
					if (results[i].from === user.userId) {
						ids.push(results[i].to);
						status.push(results[i].status);
					} else if (results[i].to === user.userId) {
						ids.push(results[i].from);
						status.push(results[i].status);
					}
				}
				for (i = 0; i < ids.length; i++) {
					for (j = 0; j < users.length; j++) {
						if (users[j].userId === ids[i]) {
							users[j].isFriend = true;	//필요 없는 변순데
							users[j].status = status[i];
							break;
						}
					}
				}
				locations = buildLocationList(req, res, users, null);	//temp변환 
	    		res.send({error: false, 
	    			message: 'geoNear lists: '+users.length, 
	    			result: locations,
	    			user: req.user,
	    			total: -99999	//1만개 까진 리스팅 안하겠지
	    		});
			}, function rejected(err) {
				res.send({error: true, message: 'get aggregated friends list error '});
			});
    		
    	} //else 
    });
};

var buildLocationList = function(req, res, results, stats) {
    var locs = [];
    results.forEach(function(doc) {
        doc.temp = showDistance( meterConversion.mToKm(doc.temp) );	//km로 변환한 값에 따라 show함수로 보여줌 1보다 더 작으면 m로
        locs.push(doc);
    });
    return locs;
};
