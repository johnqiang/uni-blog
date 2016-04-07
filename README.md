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

- 2016.04.06 Added blog editing function

- 2016.04.04 Added article page and user page, any user can view these pages without login

- 2016.04.03 Added file upload function, replaced deprecated module `markdown` with `marked`

- 2016.03.31 Added markdown support for blog posting.

- 2016.03.30 Project set up.
