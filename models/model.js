class Model {
    static get properties() {
        return {
            "id": {
                valid: (id) => typeof id === "number" && id >= 0
            },
            "created": {
                valid: (created) => created instanceof Date,
            },
            "updated": {
                valid: (updated) => updated instanceof Date,
                private: true,
            }
        };
    }

    static get db() {
        return require("../db").db;
    }

    constructor(values) {
        const { valid, message } = this.validate(values)

        if (valid) {
            Object.assign(this, values);
        } else {
            throw new Error(JSON.stringify(message));
        }
    }

    validate(values) {
        // check each supplied property
        for (const [prop, val] of Object.entries(values)) {
            // check the supplied property is valid
            if (!(prop in this.constructor.properties)) {
                return {
                    valid: false,
                    message: {
                        type: "ValidationError",
                        reason: "InvalidProperty",
                        property: prop
                    }
                }
            }

            // check the supplied value is valid for the property
            if (!(this.constructor.properties[prop].valid(val))) {
                return {
                    valid: false,
                    message: {
                        type: "ValidationError",
                        reason: "InvalidValue",
                        property: prop,
                        value: val
                    }
                }
            }
        }

        // check all required properties are supplied
        for (const prop in this.constructor.properties) {
            if (!this.constructor.properties[prop].required) continue;

            if (!values[prop]) {
                return {
                    valid: false,
                    message: {
                        type: "ValidationError",
                        reason: "MissingProperty",
                        property: prop,
                    }
                }
            }
        }

        return {
            valid: true
        }
    }
}

module.exports = Model