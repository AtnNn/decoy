let {eval, eval_defs, strict} = require('../src/interpreter');
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

let testd = str => {
    let parsed = complete(toplevel)({data:str, position:0, scope:{}, state:{}});
    if (parsed.failed) {
	console.log(str);
	console.log(parsed);
    } else {
	console.log(str, '-->', strict(eval_defs(parsed.value, builtins).test));
    }
};

test('1', 1n);
test('add 1 2', 3n);
test('(a -> add 3 a) 1', 4n);

testd('test := 1;');
testd('struct f (a b); test := f 1 2;');
testd('struct f (a b); test := (switch (f 1 2) (f a b): a;);');
