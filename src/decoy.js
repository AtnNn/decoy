let interpreter = require('./interpreter');
let grammar = require('./grammar');
let parse = require('./parse');
var builtins = require('./builtins');

let fs = require('fs');

let env = { ...builtins };

let decoy = (source) => {
    let res = parse.complete(grammar.expression)(grammar.start(source, env));
    if (!res.failed) {
	let val = interpreter.strict(interpreter.eval(res.value, env));
	if (typeof(val) == 'function') {
	    return (...args) => interpreter.call([val, ...args]);
	}
	return val;
    }
    throw new Error(res.reason);
};

let decoy_import = path => {
    let source = fs.readFileSync(path).toString('utf8');
    let res = parse.complete(grammar.toplevel)(grammar.start(source, env));
    if (res.failed) {
	throw new Error(path + ': parsing failed at ' + res.position + ': ' + res.reason);
    }
    env = res.state.env;
};

let decoy_define = (name, val) => {
    env[name] = val;
};

module.exports = { decoy, decoy_import, decoy_define };
