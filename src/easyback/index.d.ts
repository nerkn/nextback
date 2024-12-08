type AppCB = (request, response, next) => void;

type App = {
  get: (path: string, cb: AppCB) => {};
  post: (path: string, cb: AppCB) => {};
  use: AppCB;
  delete: (path: string, cb: AppCB) => {};
};
type DB = {
  query: <T>(query: string) => Promise<T[]>;
};
type Logger = (...data: any[]) => void;
/* subpath = '/api' default */
type SubPath = string;

export function nextback(
  app: App,
  db: DB,
  {
    logger,
    loginRequired,
    subPath,
    tablePrefix,
    divulgeTypeDefinitions,
  }:
  {
    logger: Logger,
    loginRequired: Boolean,
    subPath: SubPath,
    tablePrefix : String,
    divulgeTypeDefinitions: Boolean,
  }
);
