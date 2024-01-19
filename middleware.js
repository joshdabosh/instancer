const { validationResult } = require('express-validator')

const jwt = require('jsonwebtoken')

const INSTANCER_CONFIG = require('./config')

const { client } = require('./redis-manager')

const getEpochTime = () => {
    return Math.floor(new Date().getTime() / 1000)
}

const verifyJwt = (req, res, next) => {
    const authHeader = req?.headers?.authorization

    if (!authHeader) {
        res.status(403).json({
            message: 'unauthorized',
        })

        return
    }

    const values = authHeader.split(' ')

    if (values.length !== 2 || values[0] !== 'Token') {
        res.status(403).json({
            message: 'unauthorized',
        })

        return
    }

    const decoded = jwt.verify(values[1], req.jwt_secret)

    req.user = decoded

    next()
}

const verifyAdminJwt = (req, res, next) => {
    const authHeader = req?.headers?.authorization

    if (!authHeader) {
        res.status(403).json({
            message: 'unauthorized',
        })

        return
    }

    const values = authHeader.split(' ')

    if (values.length !== 2 || values[0] !== 'Token') {
        res.status(403).json({
            message: 'unauthorized',
        })

        return
    }

    const decoded = jwt.verify(values[1], req.jwt_secret)

    if (!decoded.admin) {
        res.status(403).json({
            message: 'user_must_be_admin',
        })

        return
    }

    req.user = decoded

    next()
}

const validateResults = (req, res, next) => {
    const requestOk = validationResult(req)

    if (!requestOk.isEmpty()) {
        res.status(400).json({
            message: 'invalid_values',
            fields: requestOk.array(),
        })

        return
    }

    next()
}

const ratelimitedAuthRequest = async (req, res, next) => {
    if (INSTANCER_CONFIG.redis_uri) {
        if (!req.user || !req.user.user_id) {
            res.status(403).json({
                message: 'unauthorized',
            })

            return
        }

        let bucket = await client.hGetAll(req.user.user_id.toString())

        if (!(bucket.tokens || bucket.lastAccess)) {
            bucket = {
                tokens: INSTANCER_CONFIG.ratelimit_token_cap,
                lastAccess: getEpochTime(),
            }
        } else {
            bucket.tokens = parseInt(bucket.tokens)
            bucket.lastAccess = parseInt(bucket.lastAccess)

            const minutesDiff = Math.round(
                (getEpochTime() - bucket.lastAccess) / 60
            )

            bucket.tokens = Math.min(
                INSTANCER_CONFIG.ratelimit_token_cap,
                bucket.tokens +
                    minutesDiff * INSTANCER_CONFIG.ratelimit_token_add
            )

            bucket.lastAccess = getEpochTime()
        }

        if (bucket.tokens < 1) {
            res.status(429).json({
                message: 'ratelimit_exceeded',
            })

            return
        }

        bucket.tokens -= 1

        await client.hSet(req.user.user_id.toString(), bucket)
    }

    next()
}

const asyncRequestHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch((e) => {
            res.status(500).json({
                message: 'error in ' + fn.name,
            })

            console.error(e)
        })
    }
}

module.exports = {
    verifyJwt,
    verifyAdminJwt,
    validateResults,
    ratelimitedAuthRequest: asyncRequestHandler(ratelimitedAuthRequest),
}
