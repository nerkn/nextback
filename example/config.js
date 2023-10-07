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

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use((q,r,n)=>{
  q.db =pool;   
  return n();
  })


exports.app = app
exports.db = pool
