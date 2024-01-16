const process = require('process')
const express = require('express')
const crypto = require('crypto')

const app = express()

const challengesRouter = require('./routes/challenges')
const instancesRouter = require('./routes/instances')
const authRouter = require('./routes/auth')

const cleanup = require('./util/cleanup')

const INSTANCER_CONFIG = {
    db_uri: process.env.DATABASE_URI,
    port: process.env.PORT,
    jwt_secret: process.env.JWT_SECRET,
    gcpProjectId: process.env.GCP_PROJECT_ID,
    gcpLocation: process.env.GCP_LOCATION,
    gcpClusterName: process.env.GCP_CLUSTER_NAME,
    instanceLifetime: process.env.INSTANCE_LIFETIME ?? 30 * 60,
    cleanupInterval: process.env.CLEANUP_INTERVAL ?? 60,
}

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
        const cleanupWrapper = () => cleanup(INSTANCER_CONFIG.instanceLifetime)

        cleanupWrapper()

        setInterval(cleanupWrapper, INSTANCER_CONFIG.cleanupInterval * 1000)
    })

const k8sManager = require('./kubernetes')
k8sManager
    .initKubeConfig(
        INSTANCER_CONFIG.gcpProjectId,
        INSTANCER_CONFIG.gcpLocation,
        INSTANCER_CONFIG.gcpClusterName
    )
    .then(() => {
        console.log('[k8s] initialized clients')
    })

app.listen(INSTANCER_CONFIG.port, () => {
    console.log(`[instancer] started on port ${INSTANCER_CONFIG.port}`)
})
