var log = require('./log');

exports.notFound = function notFound(req, res, next){
//	res.status(404).render('404', {title: 'Wrong Turn'});
	res.status(404).send({success:0, msg:'Not Found!', result: null });
};

exports.error = function error(err, req, res, next){
	log.error({error: err.message, stack: err.stack, ts: Date.now()});
	if(err.code === 11000){ err.code = 555; }	//mongodb dup error
	res.status(err.code || 500).send({success:0, msg:err.message, result: null });
//	res.status(500).render('500', {title: 'Mistakes Were Made'});
};
