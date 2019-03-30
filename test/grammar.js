let {match, one_of, map, char, complete, many, try_, sequence, error_message} = require('../src/parse');
let {toplevel, declaration, definition, identifier, expression, application, string, string_char, start} = require('../src/grammar');
let util = require('util');
let builtins = require('../src/builtins');

let dump = (s, x) => console.log(s + ':', util.inspect(x, false, null, true));

let count = 0;
let success = 0;
let current_test = null;

let test = (parser, str) => {
    count++;
    let res = complete(parser)(start(str, builtins, current_test));
    if(res.failed) {
	dump('input', str);
	console.log(error_message(res));
    } else {
	success++;
    }
};

let test_fail = (parser, str, position) => {
    count++;
    let res = complete(parser)(start(str, builtins, current_test));
    if(!res.failed || res.position !== position) {
	dump('input', str);
	dump('unexpected success', res);
    } else {
	success++;
    }
};

let tests = {
    match: () => test(match(/bar/), 'bar'),
    one_of: () => test(one_of([match(/a/), match(/b/)]), 'b'),
    map: () => test(map(char('a'), a => a), 'a'),
    sequence: () => test_fail(one_of([sequence([match(/b/), match(/a/)]), match(/bc/)]), 'bc', 1),
    identifier: () => test(identifier, 'abc'),
    definition: () => test(definition, 'foo := bar'),
    declaration1: () => test(declaration, 'foo := bar'),
    application1: () => test(application, 'mul 4'),
    application2: () => test(application, 'mul 4 5'),
    application3: () => test(application, 'add 1 (mul 4 5)'),
    declaration2: () => test(declaration, 'foo := add 1 (mul 4 5)'),
    string1: () => test(string_char, 'f'),
    string2: () => test(many(string_char), 'foo'),
    string3: () => test(string, '"foo"'),
    string4: () => test(expression, '"\\n"'),
    string5: () => test(expression, '(c a t) "foo" "bar"'),
    declaration3: () => test(declaration, 'main := print "hello"'),
    toplevel: () => test(toplevel, 'main := print "hello";'),
    declaration4: () => test(declaration, 'macro f x := ${g $x}'),
    application4: () => test(expression, 'add $a $b'),
    lambda: () => test(expression, '(${a} -> a)'),
    access: () => test(expression, 'a.b'),
    switch1: () => test(expression, '(switch (1) 2 -> 2; 1 -> 1;)'),
    switch2: () => test(expression, `(
       switch (1)
         2 -> 2;
         1 -> 1;
      )`),
}

let all = () => {
    for (let test in tests) {
	current_test = test;
	tests[test]();
    }
    console.log('grammar:', success, 'of', count, 'passed');
    if (success != count) {
	process.exit(1);
    }
};

all();
