let fs = require('fs');
let ast = require('./ast');
let {many, failed, value, one_of, or_else, parse, sequence, char, digit, match} = require('./parse');

let id_char1 = match(/[a-z_]/i);

let id_char = or_else(id_char1, digit);

let token = parser => parse(match(/\s*/), () => parse(parser, x => value(x)));

let identifier =
    token(parse(id_char1, x =>
		parse(many(id_char), xs =>
		      value(new ast.identifier(x + xs.join(''))))));

let bindings = identifier;

let number = token(parse(match(/[0-9]+/), n => value(new ast.number(BigInt(n)))));

let string_char = one_of([match(/[^\\"\n]/),
			  parse(match(/\\n/), () => value('\n')),
			  parse(match(/\\r/), () => value('\r')),
			  parse(match(/\\t/), () => value('\t')),
			  parse(match(/\\\\/), () => value('\\')),
			  parse(match(/\\"/), () => value('"'))]);

let string = token(parse(char('"'), () =>
			 parse(many(string_char), chars =>
			       parse(char('"'), () =>
				     value(new ast.string(chars.join('')))))));

let literal = one_of([number, string]);

let atom = one_of([literal, identifier]);

let parens = parser =>
    parse(token(char('(')), () =>
	  parse(parser, x =>
		parse(token(char(')')), () =>
		      value(x))));

let lazy = parser => (input, position) => parser()(input, position);

let lambda =
    parse(bindings, params =>
	  parse(token(match(/->/)), () =>
		parse(expression, body =>
		      value(new ast.lambda(params, body)))));

let expression = one_of([lambda, lazy(() => application), lazy(() => expression1)]);

let many2 = parser =>
    parse(parser, x =>
	  parse(parser, y =>
		parse(many(parser), xs =>
		      value([x, y, ...xs]))));

let application = parse(many2(lazy(() => expression1)), es => value(new ast.application(es)));

let expression1 = one_of([atom, parens(lazy(() => expression))]);

let definition =
    parse(bindings, id =>
	  parse(token(match(/:=/)), () =>
		parse(expression, val => 
		      value(new ast.declaration(id, val)))));

let declaration = one_of([definition]);

let toplevel = parse(many(declaration), x => parse(match(/\W*/), () => value(x)));

module.exports = {
    toplevel, declaration, definition, expression, identifier, application, string, string_char
};
