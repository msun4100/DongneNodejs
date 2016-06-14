var config = require('../config');
var Page = require('../db_models/pageModel');
//exports.csrf = function csrf(req, res, next){
//	res.locals.token = req.csrfToken();
//	next();
//};
//사용하려면 app.js에서 csrf 두개 use하고 login/register.ejs 에 히든 인풋 추가

exports.authenticated = function authenticated(req, res, next){
	req.session.isAuthenticated = req.session.passport.user !== undefined;
	res.locals.isAuthenticated = req.session.isAuthenticated;
	if (req.session.isAuthenticated) {
		res.locals.user = req.session.passport.user;
	}
	next();
};

exports.requireAuthentication = function requireAuthentication(req, res, next){
	if (req.session.isAuthenticated) {
		next();
	}else {
//		res.redirect(config.routes.login);
		res.send({success:0, msg:'requireAuth false.', result:null});	//인증이 사용되는 라우트 /chat 등을 그냥 하면 false
	}
};

exports.logOut = function logOut(req){
	req.session.isAuthenticated = false;
	req.logout();
};

exports.templateRoutes = function templateRoutes(req, res, next){
	res.locals.routes = config.routes;

	next();
};

exports.checkPage = function checkPage(req, res, next){
	console.log('req.method: ', req.method);
	if(req.method.toLowerCase() == 'get'){
		return next();
	}
	var pageId = req.body.pageId;
	Page.findOne({pageId: pageId}, function(err, doc){
		if(err) return next(err);
		if(!doc){
			res.send({ success: 0, msg:'Page Not Exists', result: null});
		} else {
			res.locals.pageId = pageId;
			req.session.pageId = pageId;
			return next();
		}
	});
};
