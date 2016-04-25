var mongodb = require('./db'),
	marked = require('marked'),
	ObjectID = require('mongodb').ObjectID,
	async = require('async');

// setting markdown module with default values
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});

function Post(name, title, head, post, tags) {
	this.name = name;
	this.title = title;
	this.head = head;
	this.post = post;
	this.tags = tags;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
	var date = new Date();
	//存储各种时间格式，方便以后扩展
	var time = {
		date: date,
		year: date.getFullYear(),
		month: date.getFullYear() + "-" + (date.getMonth() + 1),
		day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
		minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
          date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	}
	//要存入数据库的文档
	var post = {
		name: this.name,
		time: time,
		title: this.title.trim(),
		head: this.head,
		tags: this.tags,
		post: this.post,
		comments: [],
		reprint_info: {},
		pv: 0,
		ip: '' // pv: prevent page refreshing from same ip
	}
	async.waterfall([
		//打开数据库
		function (callback) {
			mongodb.open(function (err, db) {
				callback(err, db);
			});
		},
		//读取posts集合
		function (db, callback) {
			db.collection('posts', function (err, collection) {
				callback(err, collection);
			});
		},
		//将文档插入posts集合
		function (collection, callback) {
			collection.insert(post, {
				safe: true
			}, function (err) {
				callback(err);
			})
		}
	], function (err) {
		mongodb.close();
		callback(err);
	})
};
//读取文章及其相关信息
Post.getTen = function(name, page, callback) {
	async.waterfall([
		function (callback) {
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		function (db, callback) {
			db.collection('posts', function (err, collection) {
				callback(err, collection);
			});
		},
		//使用count, 返回文档总数total
		function (collection, callback) {
			var query = {}; //根据query对象查询文章
			if (name) {
				query.name = name;
			}
			collection.count(query, function (err, total) {
				callback(err, query, total, collection);
			});
		},
		function (query, total, collection, callback) {
			collection.find(query, {
				skip: (page-1)*10,
				limit: 10
			}).sort({
				time: -1
			}).toArray(function (err, docs) {
				callback(err, docs, total);
			});
		}
	], function (err, docs, total) {
		mongodb.close();
		//解析markdown为html
		docs.forEach(function (doc) {
			doc.post = marked(doc.post);
			doc.comments.forEach(function (comment) {
				comment.content = marked(comment.content);
			});
		});
		callback(err, docs, total);
	})
};
//读取所选文章详情
Post.getOne = function(id, ip, callback) {
	async.waterfall([
		function (callback) {
			mongodb.open(function (err, db) {
				callback(err, db);
			});
		},
		function (db, callback) {
			db.collection('posts', function (err, collection) {
				callback(err, collection);
			});
		},
		function (collection, callback) {
			collection.findOne({
				"_id": new ObjectID(id)
			}, function (err, doc) {
				callback(err, collection, doc);
				if (doc) {
					if (ip != doc.ip) {
						collection.updateOne({
							"_id": new ObjectID(id)
						}, {
							$inc: {"pv": 1},
							$set: {"ip": ip}
						}, function(err, result) {
							mongodb.close();
							if (err) {
								return callback(err);
							}
						});
					}
					callback(err, doc);
				}
			})
		}
	], function (err, doc) {
		//解析 markdown 为 html
		doc.post = marked(doc.post);
		doc.comments.forEach(function(comment) {
			comment.content = marked(comment.content);
		});
		callback(err, doc);
	})
};
// 返回文章内容
Post.edit = function (id, callback) {
	async.waterfall([
		//打开数据库
		function(callback) {
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		//根据用户名、发表日期及文章名进行查询
		function(db, callback) {
			db.collection('posts', function (err, collection) {
				callback(err, collection);
			});
		},
		//根据用户名、发表日期及文章名进行查询
		function(collection, callback) {
			collection.findOne({
				"_id": new ObjectID(id)
			}, function (err, doc) {
				callback(err, doc);
			});
		}
	], function (err, doc) {
		mongodb.close();
		callback(err, doc);
	})
}
// 更新一篇文章及其相关信息
Post.update = function (id, post, callback) {
	async.waterfall([
		// 打开数据库
		function(callback) {
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		//读取posts集合
		function(db, callback) {
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		// 更新文章内容
		function(collection, callback) {
			collection.update({
				"_id": new ObjectID(id)
			}, {
				$set: {post: post}
			}, function(err) {
				callback(err);
			});
		}
	], function (err) {
		mongodb.close();
		callback(err);
	})
}
//删除一篇文章
Post.remove = function(id, callback) {
	async.waterfall([
		//打开数据库
		function(callback){
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		//读取 posts 集合
		function(db, callback) {
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		//查询要删除的文档
		function(collection, callback) {
			collection.findOne({
				"_id": new ObjectID(id)
			}, function(err, doc) {
				callback(err, collection, doc);
			});
		},
		function(collection, doc, callback) {
			if (doc.reprint_info.reprint_from) {
	          	reprint_from = doc.reprint_info.reprint_from;
	          	//更新原文章所在文档的 reprint_to
	          	collection.update({
	          		"_id": new ObjectID(reprint_from.id)
	          	}, {
	          		$pull: {
	          			"reprint_info.reprint_to": {
	          				"id": id
	          			}
	          		}
	          	}, function (err) {
	          		callback(err);
	          	});
	        }
	        //根据用户名、日期和标题查找并删除一篇文章
		    collection.deleteOne({
		        "_id": new ObjectID(id)
		    }, {
		        w: 1
		    }, function (err) {
		        callback(err);
		    });
		}
	], function (err) {
		mongodb.close();
		callback(err);
	})
};
//返回所有文章存档信息
Post.getArchive = function(callback) {
	async.waterfall([
		//打开数据库
		function(callback) {
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		function(db, callback){
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		//返回只包含 name、time、title 属性的文档组成的存档数组
		function(collection, callback) {
			collection.find({}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs){
				callback(err, docs);
			});
		}
	], function(err, docs) {
		mongodb.close();
		callback(err, docs);
	});
}
Post.getTags = function(callback) {
	async.waterfall([
		// open mongodb
		function(callback) {
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		function(db, callback) {
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		//distinct 用来找出给定键的所有不同值
		function(collection, callback) {
			collection.distinct('tags', function(err, docs) {
				callback(err, docs);
			});
		}
	], function(err, docs) {
		mongodb.close();
		callback(err, docs);
	});
}
Post.getTag = function(tag, callback) {
	async.waterfall([
		// open mongodb
		function(callback) {
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		function(db, callback) {
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		//查询所有 tags 数组内包含 tag 的文档
        //并返回只含有 name、time、title 组成的数组
		function(collection, callback) {
			collection.find({
				"tags": tag
			}, {
				"name": 1,
            	"time": 1,
            	"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs) {
				callback(err, docs);
			});
		}
	], function(err, docs) {
		mongodb.close();
		callback(err, docs);
	});
}
//返回通过标题关键字查询的所有文章信息
Post.search= function(keyword, callback) {
	async.waterfall([
		// open mongodb
		function(callback){
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		function(db, callback) {
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		function(collection, callback) {
			var pattern = new RegExp(keyword, "i");
			collection.find({
				"title": pattern
			}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs) {
				callback(err, docs);
			});
		}
	], function(err, docs) {
		mongodb.close();
		callback(err, docs);
	});
}
//转载一篇文章
Post.reprint = function (reprint_from, reprint_to, callback) {
	async.waterfall([
		// open mongodb
		function(callback){
			mongodb.open(function(err, db) {
				callback(err, db);
			});
		},
		function(db, callback) {
			db.collection('posts', function(err, collection) {
				callback(err, collection);
			});
		},
		function(collection ,callback){
			collection.findOne({
				"_id": new ObjectID(id)
			}, function(err, post) {
				callback(err, collection, post);
			});
		},
		function(collection, post, callback) {
			var date = new Date();
            var time = {
                date: date,
                year : date.getFullYear(),
                month : date.getFullYear() + "-" + (date.getMonth() + 1),
                day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
                minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
                date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
            }
            delete post._id; //注意要删掉原来的 _id
            post.name = reprint_to.name;
            post.head = reprint_to.head;
            post.time = time;
            post.title = (post.title.search(/[转载]/) > -1) ? post.title : "[转载]" + post.title;
            post.comments = [];
            post.reprint_info = {"reprint_from": reprint_from};
            post.pv = 0;
            //将转载生成的副本修改后存入数据库，并返回存储后的文档
            collection.insert(post, {
            	safe: true
            }, function(err, posts) {
            	callback(err, collection, post);
            });
		},
		function(collection, post, callback) {
			//更新被转载的原文档的 reprint_info 内的 reprint_to
            collection.update({
            	"_id": new ObjectID(id)
            }, {
            	$push: {
                "reprint_info.reprint_to": {
                  "id": post.id
              }}
          	}, function (err) {
          		callback(err);
          	});
		}
	], function(err) {
		mongodb.close();
		callback(err);
	})
}
