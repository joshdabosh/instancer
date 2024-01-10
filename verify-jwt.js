const jwt = require("jsonwebtoken")

const verifyJwt = (req, res, next) => {
    const authHeader = req?.headers?.authorization

    if (!authHeader) {
        res.status(403).json({
            message: "unauthorized"
        })

        return
    }

    const values = authHeader.split(" ")
    
    if (values.length !== 2 || values[0] !== "Token") {
        res.status(403).json({
            message: "unauthorized"
        })

        return
    }

    const decoded = jwt.verify(values[1], req.jwt_secret)

    req.user = decoded

    next()
}

module.exports = verifyJwt