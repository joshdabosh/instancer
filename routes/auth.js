const express = require('express')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

const { body, validationResult } = require('express-validator')

const router = express.Router()

const { oracle_url, jwt_secret } = require('../config')

router.post('/auth', [body('token').isString()], async (req, res) => {
    // takes a JWT with admin field and verifies it against oracle

    const requestOk = validationResult(req)

    if (!requestOk.isEmpty()) {
        res.status(400).json({
            message: 'invalid_values',
            fields: requestOk.array(),
        })

        return
    }

    const authResult = await fetch(oracle_url, {
        headers: {
            Authorization: 'Token ' + req.body.token,
        },
    })

    // check that the JWT is valid
    if (!authResult.ok) {
        res.status(403).json({
            message: 'unauthorized',
        })

        return
    }

    const userData = await authResult.json()

    const token = jwt.sign(
        {
            admin: userData.user.admin,
            user_id: userData.user.id,
            team_id: userData.user.team?.id,
            competition_id: userData.competition?.id ?? -1,
        },
        jwt_secret
    )

    res.status(200).json({
        token,
    })
})

module.exports = router
