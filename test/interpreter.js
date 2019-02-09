let {eval, strict} = require('../src/interpreter');
let {expression} = require('../src/grammar');
let {complete} = require('../src/parse');

let builtins = {
    print: x => console.log(x),
    add: (a, b) => a + b
};

let test = str => {
    console.log(str + ':', strict(eval(complete(expression)(str, 0).value, builtins)));
};

test('1');
test('add 1 2');
test('(a -> add 3 a) 1')
