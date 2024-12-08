import mariadb from 'mariadb'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser'

let dbParams = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT?parseInt(process.env.DB_PORT):3306,
  database: process.env.DB_DB,
  password: process.env.DB_PASS,
  user: process.env.DB_USER,
  connectionLimit: 5,
  acquireTimeout: 2000,
  trace: true,
  //logger:console.log
};
let db;
try {
  db = mariadb.createPool(dbParams);
  console.log('trying to reach db at', dbParams.host)
  console.log('db is ', db)
  db.on("error", err => {
    console.log('Mysql error dbParams', dbParams.host)
    console.log(err); //if error
  })
} catch (e) {
  console.log('Error for params', dbParams)
  console.log(e)
}

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use((q, r, n) => {
  console.log('gelen', q.params)
  q.db = db;
  return n();
})

export {app, db}