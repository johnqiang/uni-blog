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

- 2016.04.16 User can reprinting their favorite articles

- 2016.04.15 Added searching, 404 page

- 2016.04.14 Added pv and comments statistics

- 2016.04.13 Added tags for blogs

- 2016.04.12 Archived blogs

- 2016.04.11 Added pagination for main page and user page

- 2016.04.09 User can leave comments for a blog

- 2016.04.08 User can delete blog 

- 2016.04.06 User can edit blog

- 2016.04.04 Finished article page and user page, any user can view these pages without login

- 2016.04.03 Added file upload function, replaced deprecated module `markdown` with `marked`

- 2016.03.31 Added markdown support for blog posting.

- 2016.03.30 Project set up.
