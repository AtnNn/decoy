let {match, one_of, map, char, complete, many, try_, sequence, error_message} = require('../src/parse');
let {toplevel, declaration, definition, identifier, expression, application, string, string_char, start} = require('../src/grammar');
let util = require('util');
let builtins = require('../src/builtins');

let dump = (s, x) => console.log(s + ':', util.inspect(x, false, null, true));

let count = 0;
let success = 0;

let test = (parser, str) => {
    count++;
    let res = complete(parser)(start(str, builtins, 'grammar test ' + count));
    if(res.failed) {
	dump('input', str);
	console.log(error_message(res));
    } else {
	success++;
    }
};

let test_fail = (parser, str, position) => {
    count++;
    let res = complete(parser)(start(str, builtins, 'grammar fail test ' + count));
    if(!res.failed || res.position !== position) {
	dump('input', str);
	dump('unexpected success', res);
    } else {
	success++;
    }
};

test(match(/bar/), 'bar');
test(one_of([match(/a/), match(/b/)]), 'b');
test(map(char('a'), a => a), 'a');
test_fail(one_of([sequence([match(/b/), match(/a/)]), match(/bc/)]), 'bc', 1);
test(identifier, 'abc');
test(definition, 'foo := bar')
test(declaration, 'foo := bar')
test(application, 'mul 4')
test(application, 'mul 4 5')
test(application, 'add 1 (mul 4 5)')
test(declaration, 'foo := add 1 (mul 4 5)')
test(string_char, 'f')
test(many(string_char), 'foo')
test(string, '"foo"')
test(expression, '"\\n"')
test(expression, '(c a t) "foo" "bar"')
test(declaration, 'main := print "hello"')
test(toplevel, 'main := print "hello";')
test(declaration, 'macro f x := ${g $x}')
test(expression, 'add $a $b')
test(expression, '(${a} -> a)')
test(expression, 'a.b')

console.log('grammar:', success, 'of', count, 'passed');
if (success != count) {
    process.exit(1);
}
