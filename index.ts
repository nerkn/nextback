import { app, db } from "./config";
import { Easyback } from "./src/easyback/index"
import https, { get } from 'https';
import { cert, key } from "./ssl";
import { Application, Request } from "express";
import { getUserAuth } from "./src/easyback/getUserAuth";


async function main(app, db) {  
  let easyback = await Easyback({
    db,  // https://mywebsite.com/api/v1/tablename?where
    tablePrefix: ''
  });
  app.get("/api/v1/getAllTables", (req, res) => {
    res.json(easyback.getAllTables());
  })
  app.get("/api/v1/:entityType", (req, res) => {
    easyback.entitiesList(req.params.entityType,
      req.query.where || '',
      req.query.orderby||'',
      {page:req.query.page, limit: req.query.limit}
    )
      .then((data) => res.json(data));
    return
  })
  app.post("/api/v1/:entityType", async (req:Request, res) => {
    let user = await getUserAuth(req?.body?.token)
    if (!user || !user?.userid)
      return res.status(401).json({ msg: "unauthorized", error: 1 })
    req.body.user = user.userid
    easyback.
      entitiesAddUpdate(req.params.entityType, req.body).
      then((data) => res.json(data));
  })
  app.delete("/api/v1/:entityType/:id", (req, res) => {
    easyback.entitiesDelete(req.params.entityType, parseInt(req.params.id)).then((data) => res.json(data));
  })
  app.get("/api/v1/r/:relation/:entity1Id/:entity2Id", (req, res) => {
    easyback.relationList(
      req.params.relation,
      parseInt(req.params.entity1Id),
      parseInt(req.params.entity2Id),
      parseInt(req.query.getType) || 0).then((data) => res.json(data));
  })
  app.post("/api/v1/r/:relation/:entity1Id/:entity2Id", (req, res) => {
    easyback.relationAdd(
      req.params.relation,
      parseInt(req.params.entity1Id),
      parseInt(req.params.entity2Id),
      req.body).
      then((data) => res.json(data));
  })
  app.delete("/api/v1/r/:relation/:entity1Id/:entity2Id", (req, res) => {
    easyback.relationDelete(req.params.relation, parseInt(req.params.entity1Id), parseInt(req.params.entity2Id)).then((data) => res.json(data));
  })

}
main(app, db).then(()=>{
  https.createServer({ key, cert }, app).listen(3300);
})