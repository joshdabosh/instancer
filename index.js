const process = require("process")

const express = require("express")

const app = express();

const challengesRouter = require("./routes/challenges")
const instancesRouter = require("./routes/challenges")


const INSTANCER_CONFIG = {
    db_uri: process.env.DATABASE_URI,
    port: process.env.PORT
}

app.use("/challenges", challengesRouter)
app.use("/instances", instancesRouter)

const db = require("./db")
db.init(INSTANCER_CONFIG.db_uri)

app.listen(INSTANCER_CONFIG.port, () => {
    console.log(`Instancer started on port ${INSTANCER_CONFIG.port}`)
});
