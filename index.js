const process = require('process')
const express = require('express')
const crypto = require('crypto')

const app = express()

const challengesRouter = require('./routes/challenges')
const instancesRouter = require('./routes/instances')
const authRouter = require('./routes/auth')

const cleanup = require('./util/cleanup')

const INSTANCER_CONFIG = require('./config')

app.use(express.json())

app.use((req, res, next) => {
    req.jwt_secret = INSTANCER_CONFIG.jwt_secret
    next()
})

app.use('/', authRouter)
app.use('/challenges', challengesRouter)
app.use('/instances', instancesRouter)

const db = require('./db')
db.init(INSTANCER_CONFIG.db_uri)
    .then(() => {
        console.log('[knex] db started')
    })
    .then(() => {
        console.log('[cleanup] watching')

        cleanup()
        setInterval(cleanup, INSTANCER_CONFIG.cleanupInterval * 1000)
    })

const k8sManager = require('./kubernetes')
k8sManager.initKubeConfig().then(() => {
    console.log('[k8s] initialized clients')
})

app.listen(INSTANCER_CONFIG.port, () => {
    console.log(`[instancer] started on port ${INSTANCER_CONFIG.port}`)
})
