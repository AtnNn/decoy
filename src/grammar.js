let fs = require('fs');
let ast = require('./ast');
let {many, many1, failed, value, one_of, or_else, parse, sequence, char, digit, match, lazy} = require('./parse');

let id_char1 = match(/[a-z_]/i);

let id_char = or_else(id_char1, digit);

let token = parser => parse(match(/\s*/), () => parse(parser, x => value(x)));

let identifier =
    token(parse(id_char1, x =>
		parse(many(id_char), xs =>
		      value(new ast.identifier(x + xs.join(''))))));

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

let trace = x => {
    console.log('trace', x);
    return x;
};

let binding_application =
    parens(parse(identifier, x =>
		 parse(lazy(() => bindings), xs =>
		       value(new ast.application([x, ...xs])))));

let bindings = many1(one_of([identifier, binding_application]));

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

let switch_ = parse(token(match(/switch/)), () =>
		    parse(parens(expression), val =>
			  parse(many(parse(bindings, pattern =>
					   parse(token(char(':')), () =>
						 parse(expression, body =>
						       parse(token(char(';')), () =>
							     value(new ast.case_(pattern, body))))))), cases_ =>
				value(new ast.switch_(val, cases_)))));
				

let expression1 = one_of([switch_, atom, parens(lazy(() => expression))]);

let definition =
    parse(expression, id =>
	  parse(token(match(/:=/)), () =>
		parse(expression, val => 
		      value(new ast.declaration(id, val)))));

let struct = parse(token(match(/struct/)), () =>
		   parse(identifier, name =>
			 parse(token(char('(')), () =>
			       parse(many(identifier), fields =>
				     parse(token(char(')')), () =>
					   value(new ast.struct(name, fields)))))));

let macro = parse(token(match(/macro/)), () =>
		  parse(expression, pattern =>
			parse(token(match(/:=/)), () =>
			      parse(expression, body =>
				    value(new ast.macro(pattern, body))))));

let declaration = one_of([definition, struct, macro]);

let toplevel =
    parse(many(parse(declaration, decl =>
		     parse(token(char(';')), () =>
			   value(decl)))), x =>
	  parse(match(/\W*/), () => value(x)));

module.exports = {
    toplevel, declaration, definition, expression, identifier, application, string, string_char
};
