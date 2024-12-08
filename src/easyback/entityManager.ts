import { getWhere } from './getWhere';

export const entityManagerService = ({tablesInDb, tableFields, executeQuery, logger})=>async ({
    entity,
    action,
    id,
    data,
    where,
    pagination
}: {
    entity: string;
    action: 'create' | 'list' | 'update' | 'delete';
    id?: number;
    data?: Record<string, any>;
    where?: string;
    pagination?: { page: number, limit: number }
}) => {
    if (!tablesInDb.includes(entity)) {
        return { error: 'Entity not found' };
    }

    try {
        switch (action) {
            case 'list': {
                let wherePart = '';
                const whereParams: Array<number | string | string[]> = [];
                if (where) {
                    const whereParam = getWhere(logger, where);
                    wherePart += whereParam[0];
                    whereParams.push(...whereParam[1]); // Assuming getWhere returns [query, params]
                }

                if (pagination) {
                    wherePart += ` LIMIT ? OFFSET ?`;
                    whereParams.push(pagination.limit, (pagination.page - 1) * pagination.limit);
                }

                const results = await executeQuery(
                    `SELECT * FROM ?? ${wherePart ? `WHERE ${wherePart}` : ''}`,
                    [entity, ...whereParams]
                );

                const totalResults = await executeQuery(
                    `SELECT COUNT(*) as count FROM ?? ${wherePart && !wherePart.includes('LIMIT') ? `WHERE ${wherePart.split('LIMIT')[0].trim()}` : ''}`,
                    [entity, ...whereParams.slice(0, whereParams.length - 2)] // Exclude LIMIT and OFFSET params for the count query
                );

                return {
                    data: results,
                    meta: {
                        page: pagination?.page || 1,
                        limit: pagination?.limit || 10,
                        total: totalResults[0]?.count || 0,
                    },
                };
            }

            case 'create': {
                if (!data) {
                    return { error: 'Data is required for creation' };
                }

                const fields = Object.keys(data);
                const values = Object.values(data);

                if (!fields.every(field => tableFields[entity]?.includes(field))) {
                    return { error: 'Invalid fields in data' };
                }

                const result = await executeQuery(
                    `INSERT INTO ?? (${fields.map(() => '??').join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
                    [entity, ...fields, ...values]
                );
                return { data: { id: result.insertId } };
            }

            case 'update': {
                if (!id || !data) {
                    return { error: 'ID and data are required for update' };
                }

                const fields = Object.keys(data);
                const values = Object.values(data);

                if (!fields.every(field => tableFields[entity]?.includes(field))) {
                    return { error: 'Invalid fields in data' };
                }

                const result = await executeQuery(
                    `UPDATE ?? SET ${fields.map(() => '?? = ?').join(', ')} WHERE id = ?`,
                    [entity, ...fields.flatMap((field, i) => [field, values[i]]), id]
                );
                return result.affectedRows
                    ? { data: { id } }
                    : { error: 'Record not found or not updated' };
            }

            case 'delete': {
                if (!id) {
                    return { error: 'ID is required for removal' };
                }

                const result = await executeQuery(`DELETE FROM ?? WHERE id = ?`, [entity, id]);
                return result.affectedRows
                    ? { data: { id } }
                    : { error: 'Record not found or not deleted' };
            }

            default:
                return { error: 'Invalid action' };
        }
    } catch (error: any) {
        return { error: error.message };
    }
};
