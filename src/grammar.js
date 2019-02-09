let fs = require('fs');
let ast = require('./ast');
let {many, failed, one_of, or_else, parse, sequence, char, digit, match} = require('./parse');

let id_char1 = match(/[a-z_]/i);

let id_char = or_else(id_char1, digit);

let token = parser => parse(match(/\s*/), () => parse(parser, x => ({value: x})));

let identifier =
    token(parse(id_char1, x =>
		parse(many(id_char), xs =>
		      ({value: new ast.identifier(x + xs.join(''))}))));

let bindings = identifier;

let number = token(parse(match(/[0-9]+/), n => ({value: new ast.number(BigInt(n))})));

let string_char = one_of([match(/[^\\"\n]/),
			  parse(match(/\\n/), '\n'),
			  parse(match(/\\r/), '\n'),
			  parse(match(/\\t/), '\n'),
			  parse(match(/\\\\/), '\\'),
			  parse(match(/\\"/), '"')]);

let string = token(parse(char('"'), () =>
			 parse(many(string_char), chars =>
			       parse(char('"'), () =>
				     ({value: ast.string(chars)})))))

let literal = one_of([number, string]);

let atom = one_of([literal, identifier]);

let parens = parser =>
    parse(token(char('(')), () =>
	  parse(parser, x =>
		parse(token(char(')')), () =>
		      ({value: x}))));

let lazy = parser => (input, position) => parser()(input, position);

let expression = one_of([lazy(() => application), lazy(() => expression1)]);

let application = parse(many(lazy(() => expression1)), es => ({value: new ast.application(es)}));

let expression1 = one_of([atom, parens(lazy(() => expression))]);

let definition =
    parse(bindings, id =>
	  parse(token(char("=")), () =>
		parse(expression, val => {
		    return {value: new ast.declaration(id, val)};
		})));

let declaration = one_of([definition]);

let toplevel = parse(many(declaration), x => parse(match(/\W*/), () => ({value: x})));

module.exports = {
    toplevel, declaration, definition, expression, identifier, application
};
