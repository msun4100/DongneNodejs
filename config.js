var config = {
	port: 3000,
	secret: 'secret',
	redisPort: 6379,
//	redisHost: 'localhost',
	redisHost: 'ec2-52-78-27-16.ap-northeast-2.compute.amazonaws.com',
	redisUrl: 'redis://ec2-52-78-27-16.ap-northeast-2.compute.amazonaws.com',
	routes: {
		login: '/account/login',
		logout: '/account/logout',
		register: '/account/register',
		chat: '/chat',
		facebookAuth: '/auth/facebook',
		facebookAuthCallback: '/auth/facebook/callback',
		googleAuth: '/auth/google',
		googleAuthCallback: '/auth/google/callback'
	},
	host: 'http://localhost:3000',
	facebook: {
		appID: '238242993213999',
		appSecret: '2c1d2b181222dd8221c6501213e15ace',
	},
	google: {
		//passport-google 패키지는 OpenID로 인증,
		//passport-google-oauth 는 지금의 OAuth2를 사용. npm 이름 주의할 것.
		clientID: '146117892280-6mv7gj3a1m8e835c52hd88lmdmh4kgt2.apps.googleusercontent.com',
		clientSecret: 'Y2axUkVCFJgn8lPqXa0c860G'
	},
	crypto: {
		workFactor: 32,	//5000
		keylen: 32,
		randomSize: 32		//256
	},
	rabbitMQ: {
		URL: 'amqp://guest:guest@localhost:5672',
		exchange: 'packtchat.log'
	},
	mongodb: {
		name: 'dongne',
		port: 27017,
		url: 'localhost',
		poolSize: 1
	},
	board: {
		pageSize: 10	//board list paging size
	},
	multiparty: {
		connString: "mongodb://localhost/dongne",
		maxFieldSize: 8192, 
		maxFields: 10, 
		autoFiles: false,
		
		mulChunks: "mul.chunks",
		profileChunks: "profile.chunks",
		boardChunks: "board.chunks"
	},
	gcm: {
		apiKey: "AIzaSyBMjOPg1TvJd6r-rWfi56qWkB3LOpvtXbo",
//		apiKey: "AIzaSyDT49gnPm5mECM-JO0avOZZc06ErKYboDI",
		PUSH_FLAG_CHATROOM: 1,
		PUSH_FLAG_USER: 2
	}
};

module.exports = config;
