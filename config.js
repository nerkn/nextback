require('dotenv').config();

const cookieParser = require('cookie-parser');
const mariadb = require('mariadb');
let dbParams ={
  host    : process.env.DB_HOST, 
  port    : process.env.DB_PORT,
  database: process.env.DB_DB,
  password: process.env.DB_PASS, 
  user    : process.env.DB_USER, 
  connectionLimit: 5, 
  acquireTimeout:2000,
  trace: true,
  //logger:console.log
  };
let pool;
try{
  pool = mariadb.createPool(dbParams);
  console.log('trying to reach db 2');
  console.log('dbParams', dbParams.host)
  pool.on("error", err => {

      console.log('Mysql error dbParams', dbParams.host)
      console.log(err); //if error
    })
  }catch(e){
  console.log('dbParams', dbParams.host)
    console.log(e)
  }
let tablesInDB =  pool.query({rowsAsArray: true,sql:'show tables'}).then(data=>{
  tablesInDB=data.map(d=>d[0])
  console.log(`db working, ${tablesInDB.length} tables found`)
}).catch(console.log);
let tableDefs  = pool.query({sql:`SELECT 
COLUMN_COMMENT as comment,
COLUMN_NAME as name,
DATA_TYPE  as  type,
TABLE_NAME as 'table'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '${dbParams.database}'`}).then(data=>{
  tableDefs=data
  console.log(`db working, ${tableDefs.length} columns found`)
}).catch(console.log);
BigInt.prototype.toJSON = function () {
  return this.toString();
}; 

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use((q,r,n)=>{
  q.db =pool;  
  q.tablesInDB = tablesInDB;
  q.tableDefs = tableDefs;
  return n();
  })


exports.app = app
