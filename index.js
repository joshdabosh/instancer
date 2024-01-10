const process = require('process')

const express = require('express')

const app = express()

const challengesRouter = require('./routes/challenges')
const instancesRouter = require('./routes/challenges')

const INSTANCER_CONFIG = {
    db_uri: process.env.DATABASE_URI,
    port: process.env.PORT,
}

app.use(express.json())

app.use('/challenges', challengesRouter)
app.use('/instances', instancesRouter)

const db = require('./db')
db.init(INSTANCER_CONFIG.db_uri)

const Challenge = require('./models/challenge')

// const x = new Challenge({
//     "competition":1,
//     "image_uri":"a",
//     "yaml":"a"
// });

// Challenge.find({
// }).then(res => {
//     console.log(res)
// })

app.listen(INSTANCER_CONFIG.port, () => {
    console.log(`[instancer] started on port ${INSTANCER_CONFIG.port}`)
})
