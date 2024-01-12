const process = require('process')
const express = require('express')
const crypto = require('crypto')

const app = express()

const challengesRouter = require('./routes/challenges')
const instancesRouter = require('./routes/instances')
const authRouter = require('./routes/auth')

const K8sManager = require('./kubernetes')

const INSTANCER_CONFIG = {
    db_uri: process.env.DATABASE_URI,
    port: process.env.PORT,
    jwt_secret: process.env.JWT_SECRET,
    gcpProjectId: process.env.GCP_PROJECT_ID,
    gcpLocation: process.env.GCP_LOCATION,
    gcpClusterName: process.env.GCP_CLUSTER_NAME
}



const manager = new K8sManager(
    INSTANCER_CONFIG.gcpProjectId,
    INSTANCER_CONFIG.gcpLocation,
    INSTANCER_CONFIG.gcpClusterName
)

manager.initKubeConfig()

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


app.listen(INSTANCER_CONFIG.port, () => {
    console.log(`[instancer] started on port ${INSTANCER_CONFIG.port}`)
})
