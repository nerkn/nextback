import { app, db } from "./config";
import { Easyback } from "./src/easyback/index"

let easyback = await Easyback({
  db,  // https://mywebsite.com/api/v1/tablename?where
  tablePrefix: ''
});
app.get("/:entityType", (req, res) => {
  easyback.entitiesList(req.params.entityType, req.query.where || '', req.query.orderby).then((data) => res.json(data));
  return 
})
app.post("/:entityType", (req, res) => {
  easyback.entitiesAddUpdate(req.params.entityType, req.body).then((data) => res.json(data));
})
app.delete("/:entityType/:id", (req, res) => {
  easyback.entitiesDelete(req.params.entityType, parseInt(req.params.id)).then((data) => res.json(data));
})
app.get("/r/:relation/:entity1Id/:entity2Id", (req, res) => {
  easyback.relationList(
    req.params.relation,
    parseInt(req.params.entity1Id),
    parseInt(req.params.entity2Id),
    parseInt(req.query.getType) ||0).then((data) => res.json(data));
})
app.post("/r/:relation/:entity1Id/:entity2Id", (req, res) => {
  easyback.relationAdd(
    req.params.relation,
    parseInt(req.params.entity1Id),
    parseInt(req.params.entity2Id),
    req.body).
  then((data) => res.json(data));
})
app.delete("/r/:relation/:entity1Id/:entity2Id", (req, res) => {
  easyback.relationDelete(req.params.relation, parseInt(req.params.entity1Id), parseInt(req.params.entity2Id)).then((data) => res.json(data));
})

app.listen(3300);
