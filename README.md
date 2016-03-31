# uni-blog
web blog based on Nodejs and Monogdb

---

## Feature (update)

- User registration & login with cookie session
- User access control
- blog posting
---

## Install

- Install lastest verison of `Nodejs`

- Install dependencies `node-modules`
```bash
$ npm install
```
- Download `Mongodb`

- Create new folder `blog` in root directory of mongodb

- Start `Mongodb`
```bash
$ ./mongod --dbpath ../blog/
```
- Start blog server
```bash
$ DEBUG=blog:* npm start
```
- Open your web browser, type in `localhost:3000`

----

## Developer Blogs

- 2016.03.30 Project set up.

- 2016.03.31 Added markdown support for blog posting.
