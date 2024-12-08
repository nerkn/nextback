import { Application, Request, Response, NextFunction } from "express";
import { Connection } from "mysql2";
import { getWhere } from "./getWhere";
import { getOrderBy } from "./getOrderBy";
import { ColumnDefinition, EasybackOptions } from "../types";
import { loginGuard } from "./loginRequied";


let loggedUsers: Record<string, any> = {};

function easyback(
  app: Application,
  db: Connection,
  {
    logger = console.log,
    loginRequired = false,
    loginOnlyRequiredForUserColumnTables = true,
    subPath = "/api",
    tablePrefix = "fm_",
    divulgeTypeDefinitions = false,
  }: EasybackOptions
) {
  let tablesInDB: string[] = [];
  let tableDefs: ColumnDefinition[] = [];
  LoadTables();

  function LoadTables(): void {
    db.query({ rowsAsArray: true, sql: "SHOW TABLES" })
      .then((data: any[][]) => {
        tablesInDB = data.map((d) => d[0] as string);
        logger(`db working, ${tablesInDB.length} tables found`);
      })
      .catch(logger);

    db.query({
      sql: `SELECT 
              TABLE_NAME AS 'table',
              COLUMN_NAME AS name,
              DATA_TYPE AS type,
              COLUMN_COMMENT AS comment
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME LIKE '${tablePrefix}%'`,
    })
      .then((data: ColumnDefinition[]) => {
        tableDefs = data;
        logger(`db working, ${tableDefs.length} columns found`);
      })
      .catch(logger);

    BigInt.prototype.toJSON = function () {
      return this.toString();
    };
  }

  function tableColumns(prefixedTable: string): ColumnDefinition[] {
    return tableDefs.filter((td) => td?.table === prefixedTable);
  }

  function tableColumn(prefixedTable: string, column: string): ColumnDefinition[] {
    return tableDefs.filter(
      (td) => td?.table === prefixedTable && td?.name === column
    );
  }

  function tableColumnExists(prefixedTable: string, column: string): boolean {
    return tableDefs.some(
      (td) => td?.table === prefixedTable && td?.name === column
    );
  }

  /**
   * Generates TypeScript type definitions for the database tables based on the column definitions.
   * 
   * This function iterates through the `tableDefs` array, which contains metadata about the columns in each database table.
   * It then generates a TypeScript type definition for each table, with properties for each column in the table.
   * The type definitions are generated using the appropriate TypeScript type (e.g. `number`, `string`) based on the column data type.
   * Any column comments are also included as JSDoc comments for the corresponding property.
   * 
   * @returns A string containing the generated TypeScript type definitions for all database tables.
   */
  function generateTypes(): string {
    const dbTypes: Record<string, string> = {
      int: "number",
      float: "number",
      decimal: "number",
      varchar: "string",
      text: "string",
      datetime: "string",
    };

    const results: Record<string, string[]> = tableDefs.reduce((result, column) => {
      const table = column.table.replace(tablePrefix, "");
      if (!result.hasOwnProperty(table)) result[table] = [];
      result[table].push(
        `"${column.name}": "${dbTypes[column.type] ?? "string"}";` +
        (column.comment ? ` // ${column.comment}` : "")
      );
      return result;
    }, {} as Record<string, string[]>);

    return Object.entries(results)
      .map(
        ([table, columns]) =>
          `export type ${table.charAt(0).toUpperCase() + table.slice(1)} = {\n${columns.join(
            "\n"
          )}\n};`
      )
      .join("\n");
  }

  app.get("/", (req: Request, res: Response) => {
    res.json({ msg: "not found", error: 1 });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    logger("accessing", req.path, req.params);
    next();
  });

  app.post(subPath + "/signin", async (req: Request, res: Response) => {
    logger(req.body);
    const token =
      Math.round(new Date().getTime()).toString(23) +
      Math.round(1e9 * Math.random()).toString(23);

    res.cookie("token", token);

    const userData = await db.query(
      "SELECT id, name, email FROM User WHERE email = ? AND password = ?",
      [req.body.email, req.body.password]
    );

    if (userData.length) {
      loggedUsers[token] = userData[0];
      res.json({ error: 0, data: userData[0] });
    } else {
      res.json({ error: 1, msg: "User not found" });
    }
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    logger("loggedUsers", loggedUsers);
    req.user = loggedUsers[req.cookies.token] ?? false;
    if (!loginRequired) return next();
    logger(
      "loginOnlyRequiredForUserColumnTables",
      loginOnlyRequiredForUserColumnTables
    );
    if (loginOnlyRequiredForUserColumnTables) return next();
    if (req.user) return next();
    return res.json({ error: 1, msg: "Login Required" });
  });

  app.get(subPath + "/v1/getAllTables", async (_q: Request, s: Response) => {
    s.json({
      msg: "super",
      error: 0,
      data: { tables: tablesInDB, columns: tableDefs },
    });
  });


  app.get(`${subPath}/v1/:table`, async (req: Request, res: Response) => {
    const table = `${tablePrefix}${req.params.table}`;
    let where = "";
    let orderby = "";
    const paramExtra: (string | number)[] = [];

    // Check if the table exists in the database
    if (!tablesInDB.includes(table)) {
      logger("tablesInDB", tablesInDB);
      return res.json({ msg: "Table not found", error: 1 });
    }

    if (req.query) {
      // Handling the 'where' query
      if (req.query.where) {
        let [where, params] = getWhere(logger, req.query.where as string);
        if (!loginGuard(loginRequired, tableColumnExists(table, "user"), req.user?.id))
          return res.json({ msg: "Accessing user-only table", error: 1 });
        if (!where) {
          where += " and (user = ?)";
          params.push(req.user.id);
        } else {
          where += " (user = ?)";
          params = [req.user.id];
        }
      }

      logger("where and params", where, params);

      if (!params) {
        return res.json({ msg: "Query error", error: 1 });
      }

    } else {
      if (loginRequired && tableColumnExists(table, "user")) {
        if (!req.user?.id) {
          return res.json({ msg: "Accessing user-only table", error: 1 });
        }
        where = `WHERE user = ${req.user.id}`;
      }
    }

    if (req.query.orderby) {
      orderby = getOrderBy(logger, req.query.orderby as string) || '';
    }


    logger(tableColumnExists(table, "user") ? "userTable" : '');
    logger(req.query.where, `SELECT * FROM ${table} ${where}`, paramExtra);

    try {
      const data = await db.query(`SELECT * FROM ${table} ${where} ${orderby}`, paramExtra);
      res.json({ msg: "Success", error: 0, data });
    } catch (error) {
      res.json({ msg: "Not found", error: 1, data: error });
    }
  });


}
