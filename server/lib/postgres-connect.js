const Massive = require('massive');
const monitor = require('pg-monitor');

/*

      We allow only 1 PG-server instance.

*/

module.exports ={
  postgres_connect,
}

let db =null; // singleton

async function postgres_connect() {
  if (db) return db;

  console.log(`INITIAL PG-CONNECT`)
  const {PGUSER:user, PGPASSWORD:password} =  process.env;
  console.log(`@110 Massive startup w/passwd: <${password}>`);
  const db_ = await Massive({
      host: 'ultimheat.com',
      port: 5434,
      database: 'blueink',
      user,
      password
  })

  monitor.attach(db_.driverConfig);
  db = db_;
  return db;
}
