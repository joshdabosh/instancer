const { validationResult } = require('express-validator')

const jwt = require('jsonwebtoken')

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

module.exports = {
    verifyJwt,
    verifyAdminJwt,
    validateResults,
}
