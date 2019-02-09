let {eval, eval_defs, strict} = require('../src/interpreter');
let {expression, toplevel} = require('../src/grammar');
let {complete} = require('../src/parse');

let builtins = {
    print: x => console.log(x),
    add: (a, b) => a + b
};

let test = (str, expected) => {
    out = strict(eval(complete(expression)(str, 0).value, builtins));
    if (expected !== out) {
	console.log(str);
	console.log(out);
    }
};

let testd = str => {
    let parsed = complete(toplevel)(str, 0);
    if (parsed.failed) {
	console.log(str);
	console.log(parsed);
    } else {
	console.log(str + ' -->', strict(eval_defs(parsed.value, builtins).test));
    }
};

test('1', 1n);
test('add 1 2', 3n);
test('(a -> add 3 a) 1', 4n);

testd('struct f (a b); test := f 1 2;')
