let { app, db } = require("./config");
let { easyback } = require("easyback");
easyback(app, db, {
  subPath: "/api", // https://mywebsite.com/api/v1/tablename?where
  divulgeTypeDefinitions: true, // to get typescript types
});
app.listen(3000);
