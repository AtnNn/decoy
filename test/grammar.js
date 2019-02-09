let {match, one_of, parse, char} = require('../src/parse');
let {declaration, definition, identifier} = require('../src/grammar');

console.log(match(/bar/)('bar', 0));
console.log(one_of([match(/a/), match(/b/)])('b', 0));
console.log(parse(char('a'), a => ({value: a}))('a', 0));
console.log(identifier('abc', 0));
console.log(definition('foo = bar', 0))
console.log(declaration('foo = bar', 0))
