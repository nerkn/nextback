let loggedUsers = [];

function easyback(
  app,
  db,
  {
    logger = console.log,
    loginRequired = false,
    subPath = "/api",
    tablePrefix = "fm_",
  }
) {
  let tablesInDB = [];
  let tableDefs = [];
  function LoadTables() {
    db.query({ rowsAsArray: true, sql: "show tables" })
      .then((data) => {
        tablesInDB = data.map((d) => d[0]);
        console.log(`db working, ${tablesInDB.length} tables found`);
      })
      .catch(console.log);
    db.query({
      sql: `SELECT 
            TABLE_NAME as 'table',
            COLUMN_NAME as name,
            DATA_TYPE  as  type,
            COLUMN_COMMENT as comment
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() 
            and TABLE_NAME like '${tablePrefix}%'`,
    })
      .then((data) => {
        tableDefs = data;
        console.log(`db working, ${tableDefs.length} columns found`);
      })
      .catch(console.log);

    BigInt.prototype.toJSON = function () {
      return this.toString();
    };
  }
  LoadTables();
  function tableColumns(prefixedTable) {
    return tableDefs.filter((td) => td?.table == prefixedTable);
  }
  function tableColumn(prefixedTable, column) {
    return tableDefs.filter(
      (td) => td?.table == prefixedTable && td?.name == column
    );
  }
  function tableColumnExists(prefixedTable, column) {
    return (
      tableDefs.filter((td) => td?.table == prefixedTable && td?.name == column)
        .length > 0
    );
  }
  app.get("/", (q, s) => {
    s.json({ msg: "not found", error: 1 });
  });
  app.use((q, s, n) => {
    logger("accessing", q.path, q.params);
    n();
  });

  app.post(subPath + "/signin", async (q, s) => {
    logger(q.body);
    let token =
      Math.round(new Date().getTime()).toString(23) +
      Math.round(1e9 * Math.random()).toString(23);
    /*Alternatively we can use crypto library:
        let array = new Uint16Array(5);
        self.crypto.getRandomValues(array);
        let ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
        let encodingLength = ENCODING.length
        let str = ''  
        for (let num of array) { 
            while(num){ 
                str += ENCODING[num % encodingLength]
                num = num>>5;  
            } 
        }
      */
    s.cookie("token", token);
    userData = await db.query(
      "select id, name, email from User where email=? and password=?",
      [q.body.email, q.body.password]
    );
    if (userData.length) {
      loggedUsers[token] = userData[0];
      s.json({ error: 0, data: userData[0] });
    } else {
      s.json({ error: 1, msg: "User not found" });
    }
  });

  app.use((q, s, n) => {
    logger("loggedUsers", loggedUsers);
    q.user = loggedUsers[q.cookies.token] ?? false;
    if (!loginRequired) return n();
    if (q.user) return n();
    return s.json({ error: 1, msg: "Login Required" });
  });

  /* type=semi product, title asc 
        price>15, product desc

    */
  function getOrderBy(params) {
    if (params.replaceAll(/(\w|=|,|<|>|\ |%)*/g, "")) {
      logger("error in orderby", params);
      return false;
    }
    params = params.split(",");
    if (!params.length) return false;
    let orderbys = [];
    for (p of params) {
      let sepop = p.search(/(=|<|>|%)/g);
      if (sepop < 0) {
        orderbys.push(p);
        continue;
      }
      let part1 = p.substring(0, sepop);
      let part2 = p[sepop];
      let part3 = p.substring(sepop + 1);
      switch (p[sepop]) {
        case "%":
          part2 = " like ";
          part3 = `"%${[part3]}%"`;
          break;
        default:
          part3 = `"${[part3]}"`;
      }
      orderbys.push(part1 + part2 + part3);
    }
    if (!orderbys.length) return false;
    return "order by " + orderbys.join(", ");
  }
  function getWhere(whereParam) {
    let repli = "";
    if ((repli = whereParam.replaceAll(/(\w|,|\,|\||\ |-)*/g, ""))) {
      logger("error in where", whereParam, repli);
      return false;
    }
    let params = whereParam.split("|");
    let toQuery = [],
      toParams = [];
    for (let param of params) {
      let [field, op, ...values] = param.split(",");
      let ops = "in,eq,lt,gt,like".split(",");
      if (!values.length) return false;
      if (!values[0]) return false;
      if (!ops.includes(op)) return false;
      let value = values[0];
      switch (op) {
        case "=":
        case "eq":
          op = "=";
          break;
        case "<":
        case "lt":
          op = "<";
          break;
        case ">":
        case "gt":
          op = ">";
          break;
        case "%":
        case "like":
          value = `%${values[0]}%`;
          break;
        case "in":
          value = values;
          break;
        default:
          value = values[0];
      }
      toQuery.push(`\`${field}\` ${op} (?)`);
      toParams.push(value);
    }
    return [toQuery, toParams];
  }
  app.get(subPath + "/v1/getAllTables", async (q, s) => {
    s.json({
      msg: "super",
      error: 0,
      data: { tables: tablesInDB, columns: tableDefs },
    });
  });
  app.get(subPath + "/v1/:table", async (q, s) => {
    let table = tablePrefix + q.params.table;
    let where = "";
    let orderby = "";
    let paramExtra = [];
    if (!tablesInDB.includes(table)) {
      logger("tablesInDB", tablesInDB);
      return s.json({ msg: "table not found", error: 1 });
    }

    if (q.query) {
      if (q.query.where) {
        let params = getWhere(q.query.where);
        if (loginRequired)
          if (tableColumnExists(table, "user")) {
            if (!q?.user?.id) {
              return s.json({ msg: "accessing user only table ", error: 1 });
            }
            params[0].push(`user = ?`);
            params[1].push(q.user.id);
          }
        logger("params", params);
        if (!params) return s.json({ msg: "query error", error: 1 });

        for (paramsId in params[0]) {
          paramExtra.push(params[1][paramsId]);
        }
        if (params[0].length)
          where = `where ` + params[0].map((e) => `(${e})`).join(" and ");
      } else {
        if (loginRequired)
          if (tableColumnExists(table, "user")) {
            if (!q?.user?.id) {
              return s.json({ msg: "accessing user only table ", error: 1 });
            }
            where = `where  user=${q.user.id}`;
          }
      }
      if (q.query.orderby) orderby = getOrderBy(q.query.orderby);
    }
    logger(tableColumnExists(table, "user"));
    logger(q.query.where, `select * from  ${table} ${where}`, paramExtra);
    db.query(`select * from  ${table} ${where} ${orderby}`, paramExtra)
      .then((data) => s.json({ msg: "super", error: 0, data: data }))
      .catch((e) => s.json({ msg: "not found", error: 1, data: e }));
  });
  app.post(subPath + "/v1/:table", async (q, s) => {
    let table = tablePrefix + q.params.table;
    if (!tablesInDB.includes(table)) {
      logger("tablesInDB", tablesInDB);
      return s.json({ msg: "table not found", error: 1 });
    }
    let keys = [];
    let values = [];
    logger("post to ", table, q.body);
    if (q.body) {
      for (i in q.body) {
        switch (i.toLowerCase().trim()) {
          case "user":
            if (loginRequired)
              if (!q?.user?.id) {
                return s.json({ msg: "unknown user", error: 1 });
              } else {
                q.body[i] = user.id;
              }
            break;
          case "updatedat": //lower case
          case "modifiedat": //lower case
            q.body[i] = new Date().toISOString().replaceAll(/[T|Z]/g, " ");
            break;
        }
        keys.push(`\`${i}\`=?`);
        values.push(q.body[i]);
      }
    }
    if (!keys.length) return s.json({ msg: "notting send to save", error: 1 });

    if (keys.includes(`user=?`)) {
      if (!q.user) return s.json({ msg: "user not found", error: 1 });
      let location = keys.indexOf(`user=?`);
      values[location] = q.user.id;
    }
    let qe = "";

    if (keys.includes("`id`=?") && q.body["id"] && q.body["id"] != "0") {
      values.push(q.body["id"]);
      response = db.query(
        (qe = `update  ${table} set  ${keys} where id=?`),
        values
      );
      logger("update", table, qe, values, q.body);
    } else {
      response = db.query((qe = `insert into  ${table} set  ${keys}`), values);
      logger("insert", table, qe, values, q.body);
    }
    response
      .then((d) => s.json({ data: d, error: 0 }))
      .catch((e) => s.json({ data: response, error: 1, msg: e }));
  });

  app.delete(subPath + "/v1/:table", async (q, s) => {
    let table = tablePrefix + q.params.table;
    if (!tablesInDB.includes(table)) {
      logger("tablesInDB", tablesInDB);
      return s.json({ msg: "table not found", error: 1 });
    }
    let keys = [];
    let values = [];
    logger("delete to ", table, q.body);
    if (q.body) {
      for (i in q.body) {
        keys.push("`${i}`=?");
        values.push(q.body[i]);
      }
    }
    if (loginRequired) {
      if (!q.user.id) return s.json({ msg: "user not found", error: 1 });
      if (tableColumnExists(table, "user")) {
        keys.push("`user`=?");
        values.push(q.user.id);
      }
    }
    if (!keys.length)
      return s.json({ msg: "notting send to delete", error: 1 });

    let qe = "";
    if (keys.includes("`id`=?") && q.body["id"] && q.body["id"] != "0") {
      values.push(q.body["id"]);
      response = db.query((qe = `delete  from  ${table}   where id=?`), values);
      logger("delete", response, table, qe, values, q.body);
      response
        .then((d) => s.json({ data: d, error: 0 }))
        .catch((e) => s.json({ data: response, error: 1, msg: e }));
    } else {
      return s.json({ msg: "without id you cant delete!", error: 1 });
    }
  });
  app.post(subPath + "/v1/multi/:table", async (q, s) => {
    let table = tablePrefix + q.params.table;
    if (!tablesInDB.includes(table)) {
      logger("tablesInDB", tablesInDB);
      return s.json({ msg: "table not found", error: 1 });
    }
    logger(q.body);
    let response = [];
    if (q.body) {
      try {
        for (body of q.body) {
          let keys = [];
          let values = [];
          for (i in body) {
            keys.push(`\`${i}\`=?`);
            values.push(body[i]);
          }
          if (!keys.length) {
            response.push({ msg: "notting send to save", error: 1 });
            continue;
          }
          logger(
            "instert multi,",
            keys,
            keys.includes("`id`=?"),
            body["id"],
            keys.includes(`id=?`) && body["id"]
          );
          if (keys.includes("`id`=?") && body["id"]) {
            values.push(body["id"]);
            response.push(
              await db.query(`update  ${table} set  ${keys} where id=?`, values)
            );
            logger("update");
          } else {
            response.push(
              await db.query(`insert into  ${table} set  ${keys}`, values)
            );
            logger("insert");
          }
        }
      } catch (e) {
        logger("error", e);
        return s.json({ error: 1, msg: "Error Oldu" });
      }
    }
    s.json({ data: response, error: 0 });
  });

  app.get(subPath + "/v1/:table/:id", async (q, s) => {
    let table = tablePrefix + q.params.table;
    let id = q.params.id;
    if (!id || id.replaceAll(/\w/g, ""))
      return s.json({ msg: "id cant be resolved", error: 1 });
    if (!tablesInDB.includes(table))
      return s.json({ msg: "table not found", error: 1 });
    let where = `id=?`;
    if (loginRequired) {
      if (!q?.user?.id) return s.json({ msg: "you need to login", error: 1 });
      if (tableColumnExists(table, "user")) {
        where = `user=${q.user.id} and id=?`;
      }
    }
    db.query(`select * from  ${table}  where id=? `, [id])
      .then((data) =>
        s.json({ msg: "super", error: 0, data: data.length ? data[0] : [] })
      )
      .catch((e) => s.json({ msg: "not found", error: 1, data: e }));
  });
}
exports.easyback = easyback;
