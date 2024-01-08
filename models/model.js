class Model {
    static get properties() {
        return [
            {
                name: "id",
                valid: (id) => typeof id === "number" && id >= 0,
            },
            {
                name: "created",
                valid: (created) => created instanceof Date,
            },
            {
                name: "updated",
                valid: (updated) => updated instanceof Date,
                private: true,
            },
        ];
    }

    static get db() {
        return require("../db").db;
    }
}

module.exports = Model