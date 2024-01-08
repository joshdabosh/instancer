/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("challenges", (t) => {
        t.increments("id").unsigned().primary();
        t.timestamp("created").defaultTo(knex.fn.now());
        t.timestamp("updated").defaultTo(knex.fn.now());
        t.integer("competition").unsigned();
        t.text("image_uri");
        t.text("yaml");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable("challenges")
};
