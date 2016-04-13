var express = require('express'),
	router = express.Router(),
	crypto = require('crypto'),
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
	multer = require('multer'),
	Comment = require('../models/comment.js'),
	Diary = require('../models/diary.js');
// multer configuration (Notice: API Document changed!)
var storage = multer.diskStorage({
destination: function (req, file, cb) {
    cb(null, './public/images/')
},
filename: function (req, file, cb) {
    cb(null, file.originalname)
}
})
var upload = multer({ storage: storage }).array('blogImage', 5);
// var upload = multer({
// 		dest: './public/images/',
// 		rename: function (fieldname, filename) {
// 			return filename;
// 		}}).array('blogImage', 5);

/* GET home page. */

module.exports = function(app) {

	app.get('/', function (req, res) {
		//把请求的页数转换成 number 类型
		var page = parseInt(req.query.p) || 1;
		Post.getTen(null, page, function(err, posts, total) {
			if (err) {
				posts = [];
			}
			res.render('index', { 
		    	title: '主页', 
		    	user: req.session.user,
		    	page: page,
		    	isFirstPage: (page - 1) == 0,
		    	isLastPage: ((page - 1) * 10 + posts.length) == total,
		    	success: req.flash('success').toString(),
		    	error: req.flash('error').toString(),
		    	posts: posts
			});
		})
	    
	});

	app.get('/reg', checkNotLogin);
	app.get('/reg', function (req, res) {
	    res.render('reg', { 
	    	title: '注册', 
	    	user: req.session.user,
	    	success: req.flash('success').toString(),
	    	error: req.flash('error').toString()
	    });
	});

	// user registration
	app.get('/reg', checkNotLogin);
	app.post('/reg', function (req, res) {
		var name = req.body.name,
			password = req.body.password,
			password_re = req.body.password_re;
		// 检验用户两次输入的密码是否前后一致
		if (password_re != password) {
			req.flash('error', '两次输入的密码不一致!');
			return res.redirect('/reg');
		}
		// 生成密码的 md5 值
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		var newUser = new User({
			name: name,
			password: password,
			email: req.body.email
		});
		// 检查用户名是否已存在
		User.get(name, function (err, user) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			if (user) {
				req.flash('error', '用户名已存在!');
				return res.redirect('reg');
			}
			// 如果用户名不存在，则新增用户
			newUser.save(function (err, user) {
				if (err) {
					req.flash('err', err);
					return res.redirect('reg');// 注册失败
				}
				req.session.user = newUser; // 用户信息存入session
				req.flash('success', '注册成功!');
				return res.redirect('/'); // 注册成功后返回主页
			});
		});
	});

	app.get('/login', checkNotLogin);
	app.get('/login', function (req, res) {
	    res.render('login', { 
	    	title: '登录',
	    	user: req.session.user,
	    	success: req.flash('success').toString(),
	    	error: req.flash('error').toString()
	    });
	});

	app.get('/login', checkNotLogin);
	app.post('/login', function (req, res) {
		// 生成密码的md5值
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		//检查用户时候存在
		User.get(req.body.name, function (err, user) {
			if (!user) {
				req.flash('error', '用户不存在!');
				return res.redirect('/login'); //用户不存在泽跳转到登录界面
			}
			// 检查密码时候一致
			if (user.password != password) {
				req.flash('error', '密码错误!');
				return res.redirect('/login'); //密码错误则跳转到登录界面
			}
			// 用户名密码都匹配后，将用户信息存入session
			req.session.user = user;
			req.flash('success', '登录成功!')
			return res.redirect('/'); //登录成功后跳转到主页
		})
	});

	app.get('/post', checkLogin);
	app.get('/post', function (req, res) {
	    res.render('post', { 
	    	title: '发表',
	    	user: req.session.user,
	    	success: req.flash('success').toString(),
	    	error: req.flash('error').toString()
	    });
	});

	app.post('/post', checkLogin);
	app.post('/post', function (req, res) {
		var currentUser = req.session.user,
			post = new Post(currentUser.name, req.body.title, req.body.post);
		post.save(function(err) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			req.flash('success', '发布成功！');
			return res.redirect('/');//发表成功跳转到主页
		})
	});

	app.get('/upload', checkLogin);
	app.get('/upload', function (req, res) {
		res.render('upload', {
			title: '文件上传',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/upload', checkLogin);
	app.post('/upload', function (req, res) {
		Post.upload(req, res, function (err) {
			if (err) {
				req.flash('error', err.message);
				return res.redirect('/upload');
			}
			req.flash('success', '文件上传成功!');
			res.redirect('/upload');
		})
		
	});

	app.get('/user/:name', function (req, res) {
		var page = parseInt(req.query.p) || 1;
		//检查用户是否存在
		User.get(req.params.name, function (err, user) {
			if (err) {
				req.flash('error', '用户名不存在!');
				return res.redirect('/');
			}
			//查询并返回该用户第 page 页的 10 篇文章
			Post.getTen(req.params.name, page, function (err, posts, total) {
				if (err) {
					req.flash('error', err);
					return res.redirect('/');
				}
				res.render('user', {
					title: user.name + "'s blogs",
					user: req.session.user,
					posts: posts,
					page: page,
		            isFirstPage: (page - 1) == 0,
		            isLastPage: ((page - 1) * 10 + posts.length) == total,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				})
			}) 
		})
	})

	app.get('/article/:name/:day/:title', function (req, res) {
		Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('article', {
				title: req.params.title,
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			})
		})
	})

	app.get('/edit/:name/:day/:title', checkLogin);
	app.get('/edit/:name/:day/:title', function (req, res) {
		var currentUser = req.session.user;
		Post.edit(currentUser.name, req.params.day, 
		req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err);
				return res.redirect('back');
			}
			res.render('edit', {
				title: '编辑',
				post: post,
				user: req.params.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function (req, res) {
    	var currentUser = req.session.user;
    	Post.update(currentUser.name, req.params.day, 
    	req.params.title, req.body.post, function (err) {
    		var url = encodeURI('/article/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
    		if (err) {
    			req.flash('error', err);
    			return res.redirect(url); //出错，返回文章首页
    		}
    		req.flash('success', '修改成功');
    		res.redirect(url);//成功
    	});
    });

    app.get('/delete/:name/:day/:title', checkLogin);
    app.get('/delete/:name/:day/:title', function (req, res) {
    	var currentUser = req.session.user;
    	Post.remove(currentUser.name, req.params.day, 
    	req.params.title, function (err) {
    		if (err) {
    			req.flash('error', err);
    			return res.redirect('back');
    		}
    		req.flash('success', '删除成功！');
    		return res.redirect('/');
    	});
    });

    // app.post('/comment/:name/:day/:title', checkLogin);
    app.post('/comment/:name/:day/:title', function (req, res) {
    	var date = new Date(),
      		time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
             date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var comment = {
            name: req.body.name,
            email: req.body.email,
            website: req.body.website,
            time: time,
            content: req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
    	newComment.save(function (err) {
    		if (err) {
    			req.flash('error', err);
    			return res.redirect('back');
    		}
    		req.flash('success', '评论成功');
    		res.redirect('back');
    	});
    });

    app.get('/archive', function (req, res) {
      Post.getArchive(function (err, posts) {
        if (err) {
          req.flash('error', err); 
          return res.redirect('/');
        }
        res.render('archive', {
          title: '存档',
          posts: posts,
          user: req.session.user,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()
        });
      });
    });

    app.get('/diary', checkLogin);
    app.get('/diary', function (req, res) {
    	res.render('diary', {
    		title: 'KEEP',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
    	})
    })

    app.post('/diary', checkLogin);
    app.post('/diary', function (req, res) {
    	var currentUser = req.session.user,
			diary = new Diary(currentUser.name, req.body.title, 
				req.body.post, req.body.weather, req.body.mood,
				req.body.exercise, req.body.efficiency, req.body.leetcode, 
				req.body.water);
		diary.save(function(err) {
			if (err) {
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', '发布成功！');
			return res.redirect('/chart');//发表成功跳转到日记页面
		})
    })

    app.get('/chart', checkLogin);
    app.get('/chart', function (req, res) {
    	Diary.plot(function (err, docs) {
    		var dates = [], weather = [], mood = [], 
    		efficiency = [], leetcode = [], water = [], exercises = [];
    		docs.forEach(function(doc) {
    			dates.push(doc.time.day);
    			weather.push(doc.weather);
    			mood.push(doc.mood);
    			efficiency.push(doc.efficiency);
    			leetcode.push(doc.leetcode);
    			water.push(doc.water);
    			exercises.push(doc.exercise);
    		})
    		if (err) {
    			req.flash('error', err);
    			return res.redirect('back');
    		}
    		res.render('chart', {
    			title: 'chart',
    			user: req.session.user,
    			dates: dates,
    			weather: weather,
    			mood: mood,
    			efficiency: efficiency,
    			leetcode: leetcode,
    			water: water,
    			exercises: exercises,
    			success: req.flash('success').toString(),
            	error: req.flash('error').toString()
    		})
    	})
    })

	app.get('/logout', checkLogin);
	app.get('/logout', function (req, res) {
		req.session.user = null;
		req.flash('success', '登出成功!');
		return res.redirect('/'); //登出成功后跳转到主页
	});

	function checkLogin(req, res, next) {
		if (!req.session.user) {
			req.flash('error', '未登录!');
			res.redirect('/login');
		}
		next();
	}

	function checkNotLogin(req, res, next) {
		if (req.session.user) {
			req.flash('error', '已登录!');
			res.redirect('back');
		}
		next();
	}
};
