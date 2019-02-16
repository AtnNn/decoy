
let record = function record(name, fields, field_names) {
    this.name = name
    this.fields = fields;
    this.field_names = field_names;
};

module.exports = { record };
