class Model {
    static get properties() {
        return {
            id: {
                valid: (id) => typeof id === 'number' && id >= 0,
            },
            created: {
                valid: (created) => created instanceof Date,
            },
            updated: {
                valid: (updated) => updated instanceof Date,
                private: true,
            },
        }
    }

    static get db() {
        return require('../db').db
    }

    constructor(values) {
        const { valid, message } = this.validate(values)
        this.db = require('../db').db

        if (valid) {
            Object.assign(this, values)
        } else {
            throw message
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
                        type: 'ValidationError',
                        reason: 'InvalidProperty',
                        property: prop,
                    },
                }
            }

            // check the supplied value is valid for the property
            if (!this.constructor.properties[prop].valid(val)) {
                return {
                    valid: false,
                    message: {
                        type: 'ValidationError',
                        reason: 'InvalidValue',
                        property: prop,
                        value: val,
                    },
                }
            }
        }

        // check all required properties are supplied
        for (const prop in this.constructor.properties) {
            if (!this.constructor.properties[prop].required) continue

            if (!values[prop]) {
                return {
                    valid: false,
                    message: {
                        type: 'ValidationError',
                        reason: 'MissingProperty',
                        property: prop,
                    },
                }
            }
        }

        return {
            valid: true,
        }
    }

    async save() {
        let dbObject = {}

        if (this.updated !== undefined) {
            this.updated = new Date()
        }

        for (const [prop, { valid, required }] of Object.entries(
            this.constructor.properties
        )) {
            if (required) {
                if (this[prop] === undefined) {
                    throw {
                        success: false,
                        message: {
                            type: 'ValidationError',
                            reason: 'MissingProperty',
                            property: prop,
                        },
                    }
                }

                if (!valid(this[prop])) {
                    throw {
                        success: false,
                        message: {
                            type: 'ValidationError',
                            reason: 'InvalidValue',
                            property: prop,
                            value: this[prop],
                        },
                    }
                }

                dbObject[prop] = this[prop]
            } else {
                if (this[prop] !== undefined) {
                    if (!valid(this[prop])) {
                        throw {
                            success: false,
                            message: {
                                type: 'ValidationError',
                                reason: 'InvalidValue',
                                property: prop,
                                value: this[prop],
                            },
                        }
                    }

                    dbObject[prop] = this[prop]
                }
            }
        }

        if (this.id === undefined || this.id === null) {
            // create new object
            dbObject = (
                await this.db(this.constructor.tableName)
                    .insert(dbObject)
                    .returning('*')
            )[0]

            Object.assign(this, dbObject)
        } else {
            // update existing object
            await this.db(this.constructor.tableName)
                .where('id', this.id)
                .update(dbObject)
        }
    }

    static async findOne(properties) {
        const results = await this.db(this.tableName).where(properties).limit(1)

        if (results.length > 0) {
            return new this(results[0])
        }

        return null
    }

    static async find(properties) {
        const results = await this.db(this.tableName).where(properties)

        return results.map((v) => new this(v))
    }

    static async delete(properties) {
        await this.db(this.tableName).where(properties).del()
    }
}

module.exports = Model
