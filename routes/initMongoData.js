var express = require('express');
var User = require('../db_models/userModel');
var Univ = require('../db_models/universityModel');
var Dept = require('../db_models/departmentModel');
var router = express.Router();
var async = require('async');

Univ.create({univId:0, univname: "인하대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:1, univname: "세종대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:2, univname: "서울대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:3, univname: "연세대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:4, univname: "고려대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:5, univname: "중앙대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:6, univname: "성균관대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:7, univname: "홍익대학교"}).then(function fulfilled(result) {}, function rejected(err) {});
Univ.create({univId:8, univname: "서강대학교"}).then(function fulfilled(result) {}, function rejected(err) {});

Dept.create({univId:0, deptname: "컴퓨터공학"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:0, deptname: "컴퓨터정보공학"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:0, deptname: "호텔경영학과"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:0, deptname: "호텔관광경영학부"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:0, deptname: "경영학과"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:0, deptname: "경영학부"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });

Dept.create({univId:1, deptname: "컴퓨터공학"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:1, deptname: "컴퓨터정보공학"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:1, deptname: "호텔경영학과"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:1, deptname: "호텔관광경영학부"}).then(function fulfilled(result) {}, function rejected(err) {});
Dept.create({univId:1, deptname: "경영학과"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학부"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });

Dept.create({univId:1, deptname: "경영학과1"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학부2"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학과3"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학부4"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학과5"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학부6"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학과7"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });
Dept.create({univId:1, deptname: "경영학부8"}).then(function fulfilled(result) {}, function rejected(err) { console.log(err); });