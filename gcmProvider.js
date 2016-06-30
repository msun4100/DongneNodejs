var gcm = require('node-gcm'),
	fs = require('fs'),
	config = require('./config');

//var message = new gcm.Message();
var message = new gcm.Message({
    collapseKey: 'demo2',
    delayWhileIdle: true,
    timeToLive: 3,
    data: {
        title: 'Dongne GCM demo',
        message: 'Google Cloud Messaging 테스트',
        custom_key1: 'custom data1',
        custom_key2: 'custom data2'
    }
});

var server_api_key = config.gcm.apiKey;
var sender = new gcm.Sender(server_api_key);

var registrationIds = [];
//var token = 'Android 디바이스에서 Instance ID의 token';

var token = 'e_rhdaWHuWI:APA91bEiH0zxf36zdJsQrqvBB9PHcSTsp6Tem2pDtes8921vvg_l66VSv294lr4vS5Ziv331aJjSrK3k79LAnjUhGP_-e7_c6Ux-TN89gUu5soYk_AJVZGgj8jW2SkSGDlMhVV2CpuHX';
var token2 = 'dhh6IfcRKV4:APA91bFVs1JnZrb0Ly7c4URUYZF92J4lgZAkMaw3RALOqIrE_9eGNOdVEAgz5SnkQArKXFHAQB5QYSeJw0JCTNy7qnLami0K0THwKMiBXu93-TwRQSwSWxSoETKuTCG-58lI_J0kbE-0';
var tokenS4 = 'APA91bH_rIwQAgNlym1h9mDeJgl2-drzAnwG0OqRTIL0qWaILdgMW0uVCYiuerUGa0hXScBlQ_2HoUqNGe4xHDdubEynAIi8y91cL35UyGg_v3OapRcO0Ga3w7S5vldDJ80nw3y-Iz8p';
var tokenNote3 = 'APA91bERVV5lQwTUpJVEw66qsHuff_N_eGO0Bm6pYfesIzKYzdw65_RrT4Tic4yF21wtmxbhAdm5E9GibBQLE9aBV5wsVfV2EkOE2gXyEQ90fKfWTRWFezAVV339P1fZfXolQGn1uvxX';
var token0628 = 'emiBJRG65co:APA91bHFBZIVEyUmWxhMcgRybQBH-qDV_sv1NIkJTAInUlG90tg884MWlc4angNXceJD30RN2noGeMp7o1FCNrXr1hWBVhCT0gHKyTCPJ1uJH_yx1uNhvpCFq1OgX5-9DIjC8dbsC5Yj';
var token0629 = 'emiBJRG65co:APA91bEHS0ZeM7-V2--c4INdLMIdD98W2UR95WS0QU2pgDUR4PWcNnXtmShg4GEBQ7mGRDbvLCcnwZQJFLvzeRLg7thtNKsdnVCW61mrQ5Z28fCLKNBWbFubGXmTxd-duaoGrMq35fCq';
var token0629_2 = 'djM6ArD4fg8:APA91bFhP4xdfwFyCwDx-MP5r8Qrn-pdbFkN-xtCY9-LUmGLEA_qC-96ZE9dmTOSdZPtZc0ZllWHlPUrZN4-LBArlGe93iWnBuRvDgUzLoxRjRTrekWicgalYKN0N1oWxh9ubwtcl4E0';

var tokengcm='ebBpKwmizKk:APA91bEjfzypHTo0roECMcmhDOG4s3FNzrNRu5HwK4uQ6lcgk3YPtG6kprheQ4H-T41BP80PbpXeuyD7csrARpZwKBUaxXSAHoYhiQfWI-RwcKIaTGI4WMbumAGESm8W4GO3YU90-yuo';
//token, token2 는 Ansr 테스트 푸시용
//s4, note3 는 gcmchat 테슽용
registrationIds.push(token);
//registrationIds.push(token2);
//registrationIds.push(tokenS4);
//registrationIds.push(tokenNote3);
//registrationIds.push(token0628);
registrationIds.push(tokengcm);

sender.send(message, registrationIds, 4, function (err, result) {
    console.log(result);
});