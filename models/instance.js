const Model = require('./model')

class Instance extends Model {
    static tableName = 'instances'

    static get properties() {
        return {
            ...super.properties,
            challenge_id: {
                valid: (challenge_id) => typeof challenge_id === 'number',
                required: true,
            },
            team_id: {
                valid: (team_id) => typeof team_id === 'number',
                required: true,
            },
            host: {
                valid: (host) => typeof host === 'string',
                required: true,
            },
            namespace: {
                valid: (namespace) => typeof namespace === 'string',
                required: true,
            },
        }
    }

    static async findStartedBefore(time) {
        const res = await this.db
            .table(this.tableName)
            .where('updated', '<', new Date(time))

        return res.map((i) => {
            let x = new this(i)
            console.log(x)
            return x
        })
    }
}

module.exports = Instance
