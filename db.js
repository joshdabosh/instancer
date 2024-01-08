const path = require("path");

class DB {
    constructor() {
        this.db = null;
    }

    async init(uri) {
        this.db = require("knex")({
            client: "pg",
            connection: uri,
            migrations: {
                directory: path.join(__dirname, "/migrations"),
            },
        });
        await this.db.migrate.latest();

        console.log("[knex] applied migrations")
    }
}

module.exports = new DB();
