var config = {
	host: 'http://localhost:3000',
	port: 3000,
	secret: 'secret',
	redisPort: 6379,
//	redisHost: 'localhost',
	redisHost: 'ec2-52-78-76-64.ap-northeast-2.compute.amazonaws.com',
	redisUrl: 'redis://ec2-52-78-76-64.ap-northeast-2.compute.amazonaws.com',
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
		poolSize: 5
	},
	mysql: {
//		connectionLimit: 250,
		host: '127.0.0.1',
		user: 'root',	// root
		password: '',	// 1119
		port: 3306,
		multipleStatements : true,
		database: 'gcm_chat'
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
		PUSH_FLAG_USER: 2,
		PUSH_FLAG_NEW_ROOM: 3,
		PUSH_FLAG_NOTIFICATION: 4,
		MSG_PUSH_LIKE: "님이 회원님의 게시글을 좋아합니다.",
		MSG_PUSH_REPLY: "님이 회원님의 게시글에 댓글을 남겼습니다.",
		MSG_PUSH_REPLY_ANONYMOUS: "누군가 회원님의 게시글에 댓글을 남겼습니다.",
		MSG_PUSH_CONFIRM: "님이 회원님의 친구 신청을 수락하였습니다.",
		MSG_PUSH_RECEIVE: "님의 친구신청이 도착하였습니다.",
		MSG_PUSH_NOTICE: "공지사항이 있습니다."
	},
	im: {
	    largePath: "/uploads/fullsize/",
	    thumbPath: "/uploads/thumbs/",
		largeImgName: "user_:userId_large",
		smallImgName: "user_:userId_small",
	    small: { width: 120, height: 120},
	    large: { width: 348, height: 348},
	    board: { width: 1080, height: 1080}
	},
	geoNear: {
		defaultMsg: 'somewhere'
	},
	s3: {
		bucket:{
			profile: "schooler.image.profile",
			board: "schooler.image.board",
		}
	}
};

module.exports = config;
