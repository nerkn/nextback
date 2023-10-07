let {app, db} = require('./config');
let {easyback} = require('easyback');
easyback(app, db,{subPath:'/api'} ) 
app.listen(3000)