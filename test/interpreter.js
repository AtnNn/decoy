let {eval, eval_defs, strict, record} = require('../src/interpreter');
let {expression, toplevel, start} = require('../src/grammar');
let {complete} = require('../src/parse');
let builtins = require('../src/builtins.js');

let test = (str, expected) => {
    let res = complete(expression)(start(str, builtins));
    if (res.failed) {
	console.log('failed:', str);
	console.log('error:', res.position, res.reason);
	return;
    }
    let out = strict(eval(res.value, res.state.env));
    if (expected !== out) {
	console.log('test failed:', str);
	console.log('expected:', expected);
	console.log('actual:', out);
    }
};

let testd = (str, expected) => {
    let parsed = complete(toplevel)(start(str, {}));
    if (parsed.failed) {
	console.log('input:', str);
	console.log('unexpected parse error:', parsed);
    } else {
	let res = strict(parsed.state.env.test);
	if (!same(res, expected)) {
	    console.log('input:', str);
	    console.log('unexpected result:', res);
	}
    }
};

let same = (a, b) => {
    if (a === b) {
	return true;
    }
    if (a instanceof record && b instanceof record) {
	return a.name === b.name;
	for (k of a.field_names) {
	    if (!same(a[k], b[k])) {
		return false;
	    }
	    return true;
	}
    }
    return false;
};

let make_record = (name, fields) => {
    return new record(name, fields, Object.keys(fields));
};

test('1', 1n);
test('add 1 2', 3n);
test('(a -> add 3 a) 1', 4n);

testd('test := 1;', 1n);
testd('struct f (a b); test := f 1 2;', make_record('f', {a: 1n, b: 2n}));
testd('struct f (a b); test := (switch (f 1 2) (f a b): a;);', 1n);
testd('x := ${1}; test := $x;', 1n);
testd('x := ${a}; test := (a -> $x) 1;', 1n);
testd('x := ${a}; test := switch (x) (identifier n): n;;', "a");
testd('ite := i t e -> (switch (i) true: t; false: e;); test := ite true 1 2;', 1n);

test('(${add $(number a) $(number b)} -> add a b) ${add 1 2}', 3n);
test('(${1} -> 2) ${1}', 2n)
