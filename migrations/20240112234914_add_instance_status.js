/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('instances', (t) => {
        t.dropColumn('internal_port')
        t.dropColumn('exposed_port')
        t.dropColumn('subdomain')
        t.dropColumn('deployment_type')
        t.text('status').defaultTo('stopped')
        t.text('host')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('instances', (t) => {
        t.integer('exposed_port')
        t.integer('internal_port')
        t.string('subdomain')
        t.string('deployment_type')
        t.dropColumn('status')
        t.dropColumn('host')
    })
}
