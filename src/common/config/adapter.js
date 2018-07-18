const fileCache = require('think-cache-file');
const {Console, File, DateFile} = require('think-logger3');
const path = require('path');
// const database = require('./database.js');
const mysql = require('think-model-mysql');

const isDev = think.env === 'development';

/**
 * cache adapter config
 * @type {Object}
 */
exports.cache = {
  type: 'file',
  common: {
    timeout: 24 * 60 * 60 * 1000 // millisecond
  },
  file: {
    handle: fileCache,
    cachePath: path.join(think.ROOT_PATH, 'runtime/cache'), // absoulte path is necessarily required
    pathDepth: 1,
    gcInterval: 24 * 60 * 60 * 1000 // gc interval
  }
};

/**
 * model adapter config
 * @type {Object}
 */
exports.model = {
  type: 'mysql',
  common: {
    logConnect: isDev,
    logSql: isDev,
    logger: msg => think.logger.info(msg)
  }, 
  mch: {
    handle: mysql,
    database: 'mch',
    prefix: '',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  jiaoyang: {
    handle: mysql,
    database: 'nideshop_jiaoyang',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  jisheng: {
    handle: mysql,
    database: 'nideshop_jisheng',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  cat: {
    handle: mysql,
    database: 'nideshop_cat',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  dapingkeji: {
    handle: mysql,
    database: 'nideshop_dapingkeji',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  bishuiyuan: {
    handle: mysql,
    database: 'nideshop_bishuiyuan',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  jiaju: {  
    handle: mysql,
    database: 'nideshop_jiaju',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  haixin: {  
    handle: mysql,
    database: 'nideshop_haixin',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  },
  haina: {  
    handle: mysql,
    database: 'nideshop_haina',
    prefix: 'nideshop_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: ';Classmate1133',
    dateStrings: true
  }
};

/**
 * logger adapter config
 * @type {Object}
 */
exports.logger = {
  type: isDev ? 'console' : 'dateFile',
  console: {
    handle: Console
  },
  file: {
    handle: File,
    backups: 10, // max chunk number
    absolute: true,
    maxLogSize: 50 * 1024, // 50M
    filename: path.join(think.ROOT_PATH, 'logs/app.log')
  },
  dateFile: {
    handle: DateFile,
    level: 'ALL',
    absolute: true,
    pattern: '-yyyy-MM-dd',
    alwaysIncludePattern: true,
    filename: path.join(think.ROOT_PATH, 'logs/app.log')
  }
};
