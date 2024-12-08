
export function loginGuard(
    loginRequired: boolean,
    tableNameHasUserColumn: boolean,
    userId: string | undefined): boolean {
    if (!loginRequired)
        return true;
    if (!tableNameHasUserColumn)
        return true;    
    if (userId) {
        return true;
      }
    return false;
}