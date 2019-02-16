let {match, one_of, map, char, complete, many} = require('../src/parse');
let {declaration, definition, identifier, expression, application, string, string_char} = require('../src/grammar');
let util = require('util');

let dump = x => console.log(util.inspect(x, false, null, true));

let test = (parser, str) => {
    let res = complete(parser)({data:str, position:0, state:{}, scope:{}});
    if(res.failed) {
	dump(str);
	dump(res);
    }
};

test(match(/bar/), 'bar');
test(one_of([match(/a/), match(/b/)]), 'b');
test(map(char('a'), a => a), 'a');
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
