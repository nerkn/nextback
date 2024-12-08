

type ExecuteQuery = (arg0: string, values: any[])=>any





export function OneRelation({ table1, table2, relation, executeQuery }: { table1: string; table2: string; relation: string, executeQuery: ExecuteQuery }) {
    const tableName = getTableName({ table1, table2, relation });

    function getTableName({ table1, table2, relation }: { table1: string; table2: string; relation: string }) {
        return `X_${table1}_${table2}_${relation}`;
    }

    const add = async ({
        entity1Id,
        entity2Id,
        extraFields,
    }: {
        entity1Id: number;
        entity2Id: number;
        extraFields?: Record<string, any>;
    }) => {
        const keys = ['entity1Id', 'entity2Id', ...Object.keys(extraFields || {})];
        const values = [entity1Id, entity2Id, ...(extraFields ? Object.values(extraFields) : [])];
        const placeholders = keys.map(() => '?').join(', ');

        return executeQuery(
            `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
            values
        );
    };

    const list = async ({
        entity1Id,
        entity2Id,
    }: {
        entity1Id?: number;
        entity2Id?: number;
    }) => {
        const whereClauses:any[] = [];
        const params:any[] = [];

        if (entity1Id) {
            whereClauses.push('entity1Id = ?');
            params.push(entity1Id);
        }

        if (entity2Id) {
            whereClauses.push('entity2Id = ?');
            params.push(entity2Id);
        }

        const wherePart = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        return executeQuery(
            `SELECT * FROM ${tableName} ${wherePart}`,
            params
        );
    };

    const find = async ({
        entity1Id,
        entity2Id,
    }: {
        entity1Id: number;
        entity2Id: number;
    }) => {
        const result = await executeQuery(
            `SELECT * FROM ${tableName} WHERE entity1Id = ? AND entity2Id = ?`,
            [entity1Id, entity2Id]
        );
        return result.length > 0 ? result[0] : null;
    };

    const update = async ({
        entity1Id,
        entity2Id,
        updates,
    }: {
        entity1Id: number;
        entity2Id: number;
        updates: Record<string, any>;
    }) => {
        const setClauses = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), entity1Id, entity2Id];

        return executeQuery(
            `UPDATE ${tableName} SET ${setClauses} WHERE entity1Id = ? AND entity2Id = ?`,
            values
        );
    };

    const remove = async ({
        entity1Id,
        entity2Id,
    }: {
        entity1Id: number;
        entity2Id: number;
    }) => {
        return executeQuery(
            `DELETE FROM ${tableName} WHERE entity1Id = ? AND entity2Id = ?`,
            [entity1Id, entity2Id]
        );
    };

    return { add, list, find, update, remove };
}