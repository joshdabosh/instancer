const { builtinModules } = require('module')
const process = require('process')

const INSTANCER_CONFIG = {
    db_uri: process.env.DATABASE_URI,
    oracle_url: process.env.ORACLE_URL,
    redis_uri: process.env.REDIS_URI ?? '',
    ratelimit_token_cap: process.env.RL_TOKEN_CAP ?? 30,
    ratelimit_token_add: process.env.RL_TOKEN_ADD ?? 15,
    port: process.env.PORT,
    jwt_secret: process.env.JWT_SECRET,
    gcpProjectId: process.env.GCP_PROJECT_ID,
    gcpLocation: process.env.GCP_LOCATION,
    gcpClusterName: process.env.GCP_CLUSTER_NAME,
    instanceLifetime: process.env.INSTANCE_LIFETIME ?? 30 * 60,
    cleanupInterval: process.env.CLEANUP_INTERVAL ?? 60,
}

module.exports = INSTANCER_CONFIG
