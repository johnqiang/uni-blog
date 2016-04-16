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
Post.getOne = function(name, day, title, ip, callback) {
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
				if (err) {
					mongodb.close();
					return callback(err);
				}
				if (doc) {
					if (ip != doc.ip){
						collection.updateOne({
							"name": name,
							"time.day": day,
							"title": title
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
					//解析 markdown 为 html
					doc.post = marked(doc.post);
					doc.comments.forEach(function(comment) {
						comment.content = marked(comment.content);
					});
					callback(null, doc);
				}
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
      //查询要删除的文档
      collection.findOne({
      	"name": name,
      	"time.day": day,
      	"title": title
      }, function (err, doc) {
      	if (err) {
      		mongodb.close();
      		return callback(err);
      	}
      	if (doc.reprint_info.reprint_from) {
          	reprint_from = doc.reprint_info.reprint_from;
          	//更新原文章所在文档的 reprint_to
          	collection.update({
          		"name": reprint_from.name,
          		"time.day": reprint_from.day,
          		"title": reprint_from.title
          	}, {
          		$pull: {
          			"reprint_info.reprint_to": {
          				"name": name,
          				"day": day,
          				"title": title
          			}
          		}
          	}, function (err) {
          		if (err) {
                  mongodb.close();
                  return callback(err);
                }
          	});
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
      })
      
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
				"tags": tag
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
//返回通过标题关键字查询的所有文章信息
Post.search= function(keyword, callback) {
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
			var pattern = new RegExp(keyword, "i");
			collection.find({
				"title": pattern
			}, {
				"name": 1,
				"time": 1,
				"title": 1
			}).sort({
				time: -1
			}).toArray(function (err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}
//转载一篇文章
Post.reprint = function (reprint_from, reprint_to, callback) {
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
			collection.findOne({
				"name": reprint_from.name,
				"time.day": reprint_from.day,
				"title": reprint_from.title
			}, function (err, post) {
				if (err) {
					mongodb.close();
					return callback(err);
				}
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

	            //更新被转载的原文档的 reprint_info 内的 reprint_to
	            collection.update({
	            	"name": reprint_from.name,
	            	"time.day": reprint_from.day,
	            	"title": reprint_from.title
	            }, {
	            	$push: {
	                "reprint_info.reprint_to": {
	                  "name": post.name,
	                  "day": post.time.day,
	                  "title": post.title
	              }}
	          	}, function (err) {
	          		if (err) {
	          			mongodb.close();
	          			return callback(err);
	          		}
	          	});
	          	////将转载生成的副本修改后存入数据库，并返回存储后的文档
	          	collection.insert(post, {
	                safe: true
	            }, function (err, posts) {
	            	console.log(posts.ops[0]);
	            	mongodb.close();
	            	if (err) {
	            		return callback(err);
	            	}
	            	callback(null, posts.ops[0]);
	            });
			});
		});
	});
}
