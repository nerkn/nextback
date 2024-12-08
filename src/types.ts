import { Connection } from "mariadb";

export type Logger = (...T: any) => void

export type ParamsType =  (string | number | string[])[]
export type QueryResult = [string, (string | number | string[])[]];

export interface EasybackOptions {
  db: Connection;
    logger?: (msg: string, ...args: any[]) => void;
    loginRequired?: boolean;
    loginOnlyRequiredForUserColumnTables?: boolean;
    subPath?: string;
    tablePrefix?: string;
    divulgeTypeDefinitions?: boolean;
  }
  
 export interface ColumnDefinition {
    table: string;
    name: string;
    type: string;
    comment: string;
 }
export type RelationsTable = { 
  table1	:string
  table2	:string
  relation	:string
  def	:string
  extra: string	
  }