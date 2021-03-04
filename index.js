const sqlite3 = require('sqlite3')
const sqlite = require('sqlite')
const crypto = require('crypto');
const StopWatch = require('stopwatch-node')
const ROWS_TO_INSERT = 1000000
const TIMES_TO_QUERY = 1000
const SQL_START_TRANSACTION = "BEGIN"
const SQL_END_TRANSACTION = "COMMIT"
const SQL_CREATE_TEST_TABLE = "CREATE TABLE Elokuvat (nimi TEXT, vuosi INTEGER)"
const SQL_CREATE_TABLE_INDEX = "CREATE INDEX idx_elokuva_vuosi ON Elokuvat (vuosi)"
const SQL_INSERT_DATA = "INSERT INTO Elokuvat VALUES (?, ?)"
const SQL_QUERY_MOVIES_COUNT_IN_YEAR = "SELECT COUNT(*) FROM Elokuvat WHERE vuosi = ?"

const queryRowsAsync = async (db, addIndex, sw) => {
  if (addIndex) {
    await db.run(SQL_CREATE_TABLE_INDEX)
  }

  sw.start('Making queries.')
  const queryStatement = await db.prepare(SQL_QUERY_MOVIES_COUNT_IN_YEAR)

  for (let i = 0; i < TIMES_TO_QUERY; i++) {
    const randomVuosi = getRandomInt(1900, 2001)
    
    await queryStatement.all(randomVuosi)
  }
  
  await queryStatement.finalize();
  sw.stop()
}

const insertRowsAsync = async (db, addIndex, sw) => {
  if (addIndex) {
    await db.run(SQL_CREATE_TABLE_INDEX)
  }
  
  sw.start('Inserting rows.')
  const insertStatement = await db.prepare(SQL_INSERT_DATA)
  
  for (let i = 0; i < ROWS_TO_INSERT; i++) {
    const randomNimi = crypto.randomBytes(5).toString('hex')
    const randomVuosi = getRandomInt(1900, 2001)
    
    await insertStatement.run(randomNimi, randomVuosi)
  }

  await insertStatement.finalize();
  sw.stop()
}

const runTestAsync = async (
  dbName,
  testName,
  isWithIndexBeforeInsert,
  isWithIndexBeforeQuery,
  overallTimeStopWatch,
  taskTimeStopWatch) => {
  console.log('Starting test:', testName)

  const db = await sqlite.open({ filename: dbName, driver: sqlite3.Database })
  
  overallTimeStopWatch.start(testName)
  
  await db.run(SQL_START_TRANSACTION)
  await db.run(SQL_CREATE_TEST_TABLE)
  await insertRowsAsync(db, isWithIndexBeforeInsert, taskTimeStopWatch)
  await queryRowsAsync(db, isWithIndexBeforeQuery, taskTimeStopWatch)
  await db.run(SQL_END_TRANSACTION);
  
  overallTimeStopWatch.stop()
  db.close();
}

const runTestsAsync = async () => {
  const overallTimeStopWatch = new StopWatch.StopWatch('Overall Time')
  const taskTimeStopWatch = new StopWatch.StopWatch('Task Time')

  try {
    await runTestAsync('test1woi', 'Without an index.', false, false, overallTimeStopWatch, taskTimeStopWatch)
    await runTestAsync('test2wii', 'Index added when inserting rows.', true, false, overallTimeStopWatch, taskTimeStopWatch)
    await runTestAsync('test3wiq', 'Index added when performing queries.', false, true, overallTimeStopWatch, taskTimeStopWatch)
  } catch (error) {
    console.error('An error occurred, did you remember to remove the old database files?', error)
  }

  taskTimeStopWatch.prettyPrint()
  overallTimeStopWatch.prettyPrint()
}

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}


runTestsAsync()