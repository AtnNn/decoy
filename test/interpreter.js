let {eval, eval_defs, strict, record} = require('../src/interpreter');
let {expression, toplevel} = require('../src/grammar');
let {complete} = require('../src/parse');

let builtins = {
    print: x => console.log(x),
    add: (a, b) => a + b
};

let test = (str, expected) => {
    out = strict(eval(complete(expression)({data:str, position:0, scope:{}, state:{}}).value, builtins));
    if (expected !== out) {
	console.log(str);
	console.log(out);
    }
};

let testd = (str, expected) => {
    let parsed = complete(toplevel)({data:str, position:0, scope:{}, state:{}});
    if (parsed.failed) {
	console.log('input:', str);
	console.log('unexpected parse error:', parsed);
    } else {
	let res = strict(eval_defs(parsed.value, builtins).test);
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
