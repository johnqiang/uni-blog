var mongodb = require('./db');
var crypto = require('crypto');
var async = require('async');

    function User(user) {
      this.name = user.name;
      this.password = user.password;
      this.email = user.email;
    };

    module.exports = User;

    //存储用户信息
    User.prototype.save = function(callback) {
      var md5 = crypto.createHash('md5'),
        email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
        head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";

      //要存入数据库的用户文档
      var user = {
          name: this.name,
          password: this.password,
          email: this.email,
          head: head
      };
      //打开数据库
      async.waterfall([
        function (callback) {
          mongodb.open(function(err, db) {
            callback(err, db);
          });
        },
        //读取 users 集合
        function (db, callback) {
          db.collection('users', function (err, collection) {
            callback(err, collection);
          });
        },
        //将用户数据插入 users 集合
        function (collection, callback) {
          collection.insert(user, {
            safe: true
          }, function (err, user) {
            callback(err, user[0]);
          });
        }
      ], function (err, user) {
        mongodb.close();
        callback(err, user[0]);
      });
    };

    //读取用户信息
    User.get = function(name, callback) {
      async.waterfall([
        //打开数据库
        function (callback) {
          mongodb.open(function (err, db) {
            callback(err, db);
          });
        },
        //读取 users 集合
        function (db, callback) {
          db.collection('users', function (err, collection) {
            callback(err, collection);
          });
        },
        //查找用户名（name键）值为 name 一个文档
        function (collection, callback) {
          collection.findOne({
            name: name
          }, function (err, user) {
            callback(err, user);
          })
        }
        ], function (err, user) {
          mongodb.close();
          callback(err, user);
        }
      );
    };