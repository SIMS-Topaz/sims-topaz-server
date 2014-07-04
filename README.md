sims-topaz-server
=================

Backend process of the project SIMS Topaz.

-------------------------------------------

Prerequisites
-------------

 - [Node.js](http://nodejs.org/download/)
 - [Redis](http://redis.io/download) - Make sure redis-server is running on port 6379.
 - [MySQL](http://dev.mysql.com/downloads/mysql) - Make sure mysql is running on port 3306. (Until next release)
 - [MongoDB](http://docs.mongodb.org/manual/installation/) - (In the next release) Make sure mongod is running on port 27017.


Technologies
------------

###Node.js

Event-driven server. ====> [Node.js](http://nodejs.org/)

####Installation

Go to Node.js [download page](http://nodejs.org/download/)
**Note**: Node.js version must be 0.10.x!

#####Windows

Download and execute the .msi or .exe file. Follow the instructions.

#####Mac OS / Linux

You can use [nvm](https://github.com/creationix/nvm), the Node Version Manager. It allows you to install several versions of Node.js.  
Here, an example with node v0.10.24:

    $ git clone https://github.com/creationix/nvm
    $ cd nvm
    $ source nvm.sh
    $ nvm install 0.10.24
    $ nvm use 0.10.24
    $ nvm alias default 0.10.24

To use Node.js:

    $ cd nvm
    $ source nvm.sh
    $ which node

This should show **/home/user/nvm/v0.10.24/bin/node** instead of **/usr/local/bin/node**.

###Databases

Data-store: MySQL for now. We plan to use MongoDB instead.  
Session-store: Redis.
