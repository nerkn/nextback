import { ColumnDefinition, RelationsTable } from "../../types";

type GetTableDefinitionsReturn = Promise<{ tablesInDB: string[], tableDefs: ColumnDefinition[], tableRelations: RelationsTable[] }>


export async function GetTableDefinitions({ logger, tablePrefix, executeQuery }): GetTableDefinitionsReturn {
  let tablesInDB: string[] = [];
  let tableDefs: ColumnDefinition[] = [];
  let tableRelations: RelationsTable[] = [];
  await Promise.all([
    executeQuery({ rowsAsArray: true, sql: "SHOW TABLES" })
      .then((data: any[][]) => {
        tablesInDB = data.map((d) => d[0] as string);
        logger(`db working, ${tablesInDB.length} tables found`);
      })
      .catch(logger),

    executeQuery({
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
      .catch(logger),
      
    executeQuery({
      sql: `SELECT * from relation_def`
    }).then((data: RelationsTable[]) => {
      tableRelations = data;
      logger(`db working, ${tableRelations.length} relations found`);
    }).catch(logger),
  ]
  )
  //@ts-ignore 
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
  return {tablesInDB, tableDefs, tableRelations};
  }