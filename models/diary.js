var mongodb = require('./db');

function Diary(author, title, post, weather, mood, exercise, efficiency, leetcode, water) {
	this.author = author;
	this.title = title;
	this.post = post;
	this.weather = weather;
	this.mood = mood;
	this.exercise = exercise;
	this.efficiency = efficiency;
	this.leetcode = leetcode;
	this.water = water;
}

module.exports = Diary;

Diary.prototype.save = function(callback) {
	var date = new Date();
	//save date format for extension
	var time = {
		date: date,
		year: date.getFullYear(),
		month: date.getMonth() + 1,
		day: date.getDate(),
		minute: date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	}
	// file to be saved
	var diary = {
		author: this.author,
		time: time,
		title: this.title.trim(),
		post: this.post,
		weather: this.weather,
		mood: this.mood,
		exercise: this.exercise,
		efficiency: this.efficiency,
		leetcode: this.leetcode,
		water: this.water
	}
	// open mongodb
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('diaries', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			collection.insert(diary, {
				safe: true
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
Diary.plot = function(callback) {
	// open mongodb
	mongodb.open(function (err, db) {
		if (err) {
			return callback(err);
		}
		db.collection('diaries', function (err, collection) {
			if (err) {
				mongodb.close();
				return callback(err);
			}
			collection.find().toArray(function(err, docs) {
				mongodb.close();
				if (err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}