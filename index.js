const process = require("process")

const express = require("express")

const app = express();

const challengesRouter = require("./routes/challenges")
const instancesRouter = require("./routes/challenges")


app.use("/challenges", challengesRouter)
app.use("/instances", instancesRouter)

app.listen(process.env.PORT, () => {
    console.log(`Instancer started on port ${process.env.PORT}`)
});
