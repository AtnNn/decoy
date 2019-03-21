let interpreter = require('./interpreter');
let grammar = require('./grammar');
let parse = require('./parse');
var builtins = require('./builtins');

let fs = require('fs');

let env = { __parent_scope: builtins };

let decoy = (source) => {
    let loc = (new Error()).stack.split('\n    at ')[2]
    let res = parse.complete(grammar.expression)(grammar.start(source, env, loc));
    if (!res.failed) {
	let val = interpreter.eval(res.value, env);
	val = interpreter.strict(val);
	if (typeof(val) == 'function') {
	    return (...args) => interpreter.call([val, ...args]);
	}
	return val;
    }
    throw new Error(parse.error_message(res));
};

let decoy_import = path => {
    let source = fs.readFileSync(path).toString('utf8');
    let res = parse.complete(grammar.toplevel)(grammar.start(source, env, path));
    if (res.failed) {
	throw new Error(parse.error_message(res));
    }
};

let decoy_define = (name, val) => {
    env[name] = val;
};

module.exports = { decoy, decoy_import, decoy_define };
