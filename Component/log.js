var log4js = require('log4js');
log4js.configure({
appenders: { runtime: { type: 'file', filename: 'logs/runtime.log' } },
categories: { default: { appenders: ['runtime'], level: 'info' } }
});
exports.logger = log4js.getLogger('runtime');
