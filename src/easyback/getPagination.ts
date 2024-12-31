
export function getPagination(page: number, limit: number,
    minlimit: number = 10, maxlimit: number = 100): string {
    
    limit = Math.max(Math.min(limit, maxlimit), minlimit) || minlimit;
    let pagination = (page > 0 ) ?
        ` limit ${limit} offset ${(page - 1) * limit}` :
        ` limit  ${minlimit}`;
    return pagination
}