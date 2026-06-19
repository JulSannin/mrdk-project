import {Pool, types} from 'pg';
import logger from './logger.js';

// DATE (OID 1082) отдаём как строку 'YYYY-MM-DD', а не как JS Date:
// иначе сериализация в JSON даёт сдвиг даты на день из-за таймзоны.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({connectionString: process.env.DATABASE_URL});

pool.connect()
    .then(client => {
        client.release();
        logger.info('БД подключена');
    })
    .catch(err => {
        logger.error('Ошибка подключения к БД', { error: err.message});
        process.exit(1);
    })

export default pool