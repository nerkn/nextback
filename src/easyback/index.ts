
import { getWhere } from "./getWhere";
import { getOrderBy } from "./getOrderBy";
import { EasybackOptions } from "../types";
import { GetTableDefinitions } from "./utils/GetTableDefinitions";

export async function Easyback(
    {
        db,
        logger = console.log,
        tablePrefix = "fm_",
    }: EasybackOptions
) {
    let { tablesInDB, tableDefs, tableRelations } =
        await GetTableDefinitions({
            logger,
            executeQuery: (r) => db.query(r),
            tablePrefix
        });
    const tableExist = (table) => {
        if (tablesInDB.includes(table))
            return true;
        logger("table not found on tablesInDB", table, tablesInDB);
        return false;
    }
    return {
        //q.param.table,  q.params.where, q.params.orderby
        entitiesList: (entityType: string, where: string, orderby: string) => {
            let whereParam = getWhere(logger, where);
            let orderbyParam = getOrderBy(logger, orderby);
            if (!tableExist(entityType))
                return new Promise((resolve) => resolve({ msg: "table not found", error: 1 })) 

            return db.query(`select * from ??  ${whereParam[0]} `,
                [entityType,
                    ...whereParam[1],
                ])
                .then((data) => ({ msg: "super", error: 0, data: data }))
                .catch((e) => ({ msg: "not found", error: 1, data: e }));

        },
        entitiesAddUpdate: (entityType: string, data: Record<string, string[]>) => {
            if (!tableExist(entityType))
                return new Promise((resolve) => resolve({ msg: "table not found", error: 1 })) 

            let keys: string[] = [];
            let values: string[] = [];
            let processes = {}
            logger("post to ", entityType, data);
            if (data) {
                for (let key in data) {
                    let mkey = key.toLowerCase().trim()
                    switch (mkey) {
                        case "updatedat":
                        case "mtime":
                        case "modifiedat":
                            processes[mkey] = new Date().toISOString().replaceAll(/[T|Z]/g, " ");
                            break;
                        default:
                            processes[mkey] = data[key]
                    }
                    keys.push(`\`${mkey}\`=?`);
                    values.push(processes[mkey]);
                }
            }

            return db.query(`insert into ?? set ?`,
                [entityType, { ...data, ...processes }])
                .then((data) => ({ msg: "super", error: 0, data: data }))
                .catch((e) => ({ msg: "not found", error: 1, data: e }));
        },
        entitiesDelete: (entityType: string, id: number) => {
            if (!tableExist(entityType))
                return new Promise((resolve) => resolve({ msg: "table not found", error: 1 }))
            return db.query(`delete from ?? where id = ?`,
                [entityType, id])
                .then((data) => ({ msg: "super", error: 0, data: data }))
                .catch((e) => ({ msg: "not found", error: 1, data: e }));
        },
        relationList: (
            relation: string,
            entity1Id: number,
            entity2Id: number,
            getType: 0 | 1 | 2 | 3
        ) => {
            let definition = tableRelations.find((r) => r.relation === relation)
            if (!definition)
                return new Promise((resolve) => resolve({ msg: "relation not found", error: 1 })) 

            let select = ``;
            let datas: (string | number)[] = [];
            switch (getType) {
                case 0:
                    select = `select * from relations where 
                    relation = ? and entity1Id = ? and entity2Id = ?`;
                    datas = [relation, entity1Id, entity2Id];
                    break;
                case 1:
                    select = `select * from relations as r, ?? as t1 where 
                    relation = ? and entity1Id = ? and entity2Id = ? and
                    r.entity1Id = t1.id`;
                    datas = [definition.table1, relation, entity1Id, entity2Id];
                    break;
                case 2:
                    select = `select * from relations as r, ?? as t2 where 
                    relation = ? and entity1Id = ? and entity2Id = ? and
                    r.entity2Id = t2.id`;
                    datas = [definition.table2, relation, entity1Id, entity2Id];
                    break;
                case 3:
                    select = `select * from relations as r, ?? as t1, ?? as t2 where 
                    relation = ? and entity1Id = ? and entity2Id = ? and
                    r.entity1Id = t1.id and r.entity2Id = t2.id`;
                    datas = [definition.table1, definition.table2, relation, entity1Id, entity2Id];
                    break;
            }

            return db.query(select, datas)
                .then((data) => ({ msg: "super", error: 0, data: data }))
                .catch((e) => ({ msg: "not found", error: 1, data: e }));
        },
        relationAdd: (relation: string, entity1Id: number, entity2Id: number, extra: any) => {
            let definition = tableRelations.find((r) => r.relation === relation)
            if (!definition)
                return new Promise((resolve) => resolve({ msg: "relation not found", error: 1 })) 

            return db.query(`insert into relations set 
                relation = ?, en1 = ?, en2 = ?, extra = ?`,
                [definition.relation, entity1Id, entity2Id, extra])
                .then((data) => ({ msg: "super", error: 0, data: data }))
                .catch((e) => ({ msg: "not found", error: 1, data: e }));
        },
        relationDelete: (relation: string, entity1Id: number, entity2Id: number) => {
            let definition = tableRelations.find((r) => r.relation === relation)
            if (!definition)
                return new Promise((resolve) => resolve({ msg: "relation not found", error: 1 })) 

            return db.query(`delete from relations where 
                relation = ? and entity1Id = ? and entity2Id = ?`,
                [definition.relation, entity1Id, entity2Id])
                .then((data) => ({ msg: "super", error: 0, data: data }))
                .catch((e) => ({ msg: "not found", error: 1, data: e }));
        }
    }
}