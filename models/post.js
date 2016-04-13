var mongodb = require('./db'),
	marked = require('marked');

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

function Post(name, title, post, tags) {
	this.name = name;
	this.title = title;
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
		tags: this.tags,
		post: this.post,
		comments: []
	}
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		//读取posts集合
		 db.collection('posts', function (err, collection) {
		 	if (err) {
		 		return callback(err);
		 	}
		 	//将文档插入posts集合
		 	collection.insert(post, {
		 		safe: true
		 	}, function (err) {
		 		mongodb.close();
		 		if (err) {
		 			return callback(err);//失败，返回err
		 		}
		 		callback(null);//返回err为null
		 	});
		 });
	});
};
//读取文章及其相关信息
Post.getTen = function(name, page, callback) {
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			var query = {}; //根据query对象查询文章
			if (name) {
				query.name = name;
			}
			//使用count, 返回文档总数total
			collection.count(query, function (err, total) { 
				collection.find(query, {
	              skip: (page - 1)*10,
	              limit: 10
	            }).sort({
					time: -1
				}).toArray(function (err, docs) {
					mongodb.close();
					if (err) {
						return callback(err);//失败，返回err
					}
					//解析markdown为html
					docs.forEach(function (doc) {
						doc.post = marked(doc.post);
						doc.comments.forEach(function (comment) {
							comment.content = marked(comment.content);
						});
					});
					callback(null, docs, total);//成功！以数组形式返回查询结果
				});
			});
		});
	});
};
//读取所选文章详情
Post.getOne = function(name, day, title, callback) {
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		//读取posts集合
		db.collection('posts', function(err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//根据用户名、发表日期及文章名进行查询
			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			}, function (err, doc) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				//解析 markdown 为 html
				if (doc) {
					doc.post = marked(doc.post);
					doc.comments.forEach(function(comment) {
						comment.content = marked(comment.content);
					});
				}
				callback(null, doc);
			})
		});
	});
};
// 返回文章内容
Post.edit = function (name, day, title, callback) {
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//根据用户名、发表日期及文章名进行查询
			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			}, function (err, doc) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, doc);
			});
		});
	});
}
// 更新一篇文章及其相关信息
Post.update = function (name, day, title, post, callback) {
	// 打开数据库
	mongodb.open (function (err, db) {
	if (err) {
		return callback(err);
	}
	//读取posts集合
	db.collection ('posts', function (err, collection) {
		if (err) {
			mongodb.close();
			return callback(err);
		}
		// 更新文章内容
		collection.update({
			"name": name,
			"time.day": day,
			"title": title
		}, {
			$set: {post: post}
		}, function (err) {
			mongodb.close();
			if (err) {
				return callback(err);
			}
			callback(null);
		})
	})
	})
}
//删除一篇文章
Post.remove = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //根据用户名、日期和标题查找并删除一篇文章
      collection.deleteOne({
        "name": name,
        "time.day": day,
        "title": title
      }, {
        w: 1
      }, function (err) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
};
//返回所有文章存档信息
Post.getArchive = function(callback) {
	//打开数据库
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//返回只包含 name、time、title 属性的文档组成的存档数组
			collection.find({}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs){
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}
Post.getTags = function(callback) {
	// open mongodb
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//distinct 用来找出给定键的所有不同值
			collection.distinct('tags', function(err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}
Post.getTag = function(tag, callback) {
	// open mongodb
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('posts', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			//查询所有 tags 数组内包含 tag 的文档
          	//并返回只含有 name、time、title 组成的数组
			collection.find({
				'tags': tag
			}, {
				"name": 1,
            	"time": 1,
            	"title": 1
			}).sort({
				time: -1
			}).toArray(function(err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}
