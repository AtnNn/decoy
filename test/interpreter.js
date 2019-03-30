let {eval, eval_defs, strict, record} = require('../src/interpreter');
let {expression, toplevel, start} = require('../src/grammar');
let {complete, error_message} = require('../src/parse');
let builtins = require('../src/builtins.js');

let success = 0;
let count = 0;

let current_test = null;

let env = { __parent_scope: builtins, a: {b: 1n} };

let test = (str, expected) => {
    count++;
    let res = complete(expression)(start(str, env, current_test));
    if (res.failed) {
	console.log('failed:', str);
	console.log(error_message(res));
	return;
    }
    let out = strict(eval(res.value, env));
    if (expected !== out) {
	console.log('test', current_test, 'failed:', str);
	console.log('  expected:', expected);
	console.log('  actual:', out);
    } else {
	success++;
    }
};

let testd = (str, expected) => {
    count++;
    let parsed = complete(toplevel)(start(str, env, current_test));
    if (parsed.failed) {
	console.log('input:', str);
	console.log('unexpected parse error:', parsed);
    } else {
	let res = strict(env.test);
	if (!same(res, expected)) {
	    console.log('input:', str);
	    console.log('unexpected result:', res);
	} else {
	    success++;
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

let tests = {
    number: () => test('1', 1n),
    application: () => test('add 1 2', 3n),
    lambda: () => test('(a -> add 3 a) 1', 4n),
    delcaration: () => testd('test := 1;', 1n),
    record: () => testd('struct f (a b); test := f 1 2;', make_record('f', {a: 1n, b: 2n})),
    switch: () => testd('struct f (a b); test := (switch (f 1 2) (f a b) -> a;);', 1n),
    macro1: () => testd('x := ${1}; test := $x;', 1n),
    macro2: () => testd('x := ${a}; test := (a -> $x) 1;', 1n),
    macro3: () => testd('x := ${a}; test := switch (x) (identifier _ n) -> n;;', "a"),
    ite: () => testd('ite := i t e -> (switch (i) true -> t; false -> e;); test := ite true 1 2;', 1n),
    macro4: () => test('(${add $(number _ a) $(number _ b)} -> add a b) ${add 1 2}', 3n),
    macro5: () => test('(${1} -> 2) ${1}', 2n),
    access1: () => test('a.b', 1n),
    access2: () => testd('struct f (a); test := (f 1).a;', 1n),
};

let run = (tests) => {
    for (let test in tests) {
	current_test = test;
	tests[test]();
    }
    console.log('interpreter:', success, 'of', count, 'passed');
    if (success != count) {
	process.exit(1);
    }
};

let patterns = process.argv.slice(2);
if (patterns.length) {
    let few = {};
    for (let test in tests) {
	for (let pattern of patterns) {
	    if (test.match(new RegExp(pattern))) {
		few[test] = tests[test];
	    }
	}
    }
    run (few);
} else {
    run(tests);
}
