let {match, one_of, parse, char, complete, many} = require('../src/parse');
let {declaration, definition, identifier, expression, application, string, string_char} = require('../src/grammar');
let util = require('util');

let dump = x => console.log(util.inspect(x, false, null, true));

let test = (parser, str) => {
    let res = complete(parser)(str, 0);
    if(res.failed) {
	dump(str);
	dump(res);
    }
};

test(match(/bar/), 'bar');
test(one_of([match(/a/), match(/b/)]), 'b');
test(parse(char('a'), a => ({value: a})), 'a');
test(identifier, 'abc');
test(definition, 'foo := bar')
test(declaration, 'foo := bar')
test(application, 'mul 4 5')
test(application, 'add 1 (mul 4 5)')
test(declaration, 'foo := add 1 (mul 4 5)')
test(string_char, 'f')
test(many(string_char), 'foo')
test(string, '"foo"')
test(expression, '"\\n"')
test(expression, '(c a t) "foo" "bar"')
