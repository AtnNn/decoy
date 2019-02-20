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
    antiquote: ['expression', 'parse_env']
};

for (let name in records) {
    let fields = records[name];
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

module.exports.reduce = (syntax, f) => {
    return f(ast.is_declaration(syntax) ? ast.mk_declaration(syntax.lhs, f(syntax.rhs)) :
             ast.is_application(syntax) ? ast.mk_application(syntax.children.map(f)) :
	     ast.is_switch(syntax) ? ast.mk_switch(f(syntax.value), syntax.cases.map(c => ast.mk_case(c.pattern, f(c.body)))) :
	     syntax);
};
