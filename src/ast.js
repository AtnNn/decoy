let {record} = require('./data');

let records = {
    declaration: ['lhs',  'rhs'],
    identifier: ['name'],
    application: ['children'],
    number: ['value'],
    string: ['value'],
    lambda: ['params', 'body'],
    struct: ['name', 'fields'],
    switch: ['value', 'cases'],
    case: ['pattern', 'body'],
    quote: ['ast'],
    antiquote: ['expression', 'parse_env'],
    access: ['namespace', 'name']
};

for (let name in records) {
    let fields = ['loc', ...records[name]];
    module.exports['mk_' + name] = (...args) => {
	let props = {};
	for (let k of fields) {
	    props[k] = args.shift();
	}
	return new record(name, props, fields);
    };
    module.exports['is_' + name] = x => {
	return x.name === name;
    };
}

let ast = module.exports;
