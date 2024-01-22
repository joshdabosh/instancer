/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.table('instances', (t) => {
        t.dropColumn('status')
        t.text('namespace')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table('instances', (t) => {
        t.dropColumn('namespace')
        t.text('status')
    })
}
