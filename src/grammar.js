let fs = require('fs');
let ast = require('./ast');
let {many, many1, failed, one_of, or_else, sequence, char, digit, match, lazy,
     value, bind, map, binds, maps, tracep} = require('./parse');

let trace = (...args) => {
    console.log('trace:', ...args);
    return args[args.length - 1];
};

let id_char1 = match(/[a-z_]/i);

let id_char = or_else(id_char1, digit);

let token = parser => maps([match(/\s*/), parser], (_, x) => x);

let dollar = token(match(/\$/));

let identifier =
    token(maps([id_char1, many(id_char)], (x, xs) =>
	       new ast.identifier(x + xs.join(''))));

let number = token(map(match(/[0-9]+/), n => new ast.number(BigInt(n))));

let string_char = one_of([match(/[^\\"\n]/),
			  map(match(/\\n/), () => '\n'),
			  map(match(/\\r/), () => '\r'),
			  map(match(/\\t/), () => '\t'),
			  map(match(/\\\\/), () => '\\'),
			  map(match(/\\"/), () => '"')]);

let string = token(maps([char('"'), many(string_char),  char('"')],
			(_, chars, __) => new ast.string(chars.join(''))));

let literal = one_of([number, string]);

let atom = one_of([literal, identifier]);

let parens = parser =>
    maps([token(char('(')),  parser, token(char(')'))],
	 (_, x, __) => x);

let binding_application =
    parens(maps([identifier, lazy(() => bindings)],
		(x, xs) => new ast.application([x, ...xs])));

let bindings = many1(one_of([identifier, binding_application]));

let lambda =
    maps([bindings, token(match(/->/)), lazy(() => expression)],
	 (params, _, body) => new ast.lambda(params, body));

let macro_expand = parser => input => {
    let res = parser(input);
    if (res.failed) {
	return res;
    }
    for (let macro of input.state.macros || []) {
	let m = syntax_match(macro.pattern, res.value);
	if (!m.failed) {
	    let val = eval(macro.body, {...input.state.macro_env, ...syntax_value_env(m.env)});
	    return value_syntax(val);
	}
    }
    return res;
};

let expression = one_of([lambda, lazy(() => application), lazy(() => expression1)]);

let many2 = parser =>
    maps([parser, parser, many(parser)],
	 (x, y, xs) => [x, y, ...xs]);

let application = map(many2(lazy(() => expression1)), es => new ast.application(es));

let case_ = maps([bindings, token(char(':')), expression, token(char(';'))],
		 (pattern, _, body, __) => new ast.case_(pattern, body));

let switch_ = maps([token(match(/switch/)), parens(expression), many(case_)],
		    (_, val, cases) => new ast.switch_(val, cases));

let quote = maps([token(match(/\$\{/)), lazy(() => one_of([declaration, expression])), token(match(/}/))], (_, x, __) => new ast.quote(x));

let antiquote = maps([dollar, lazy(() => expression1)], (_, x) => new ast.antiquote(x));

let expression1 = one_of([switch_, atom, quote, antiquote, parens(lazy(() => expression))]);

let definition =
    maps([expression, token(match(/:=/)), expression],
	 (id, _, val) => new ast.declaration(id, val));

let struct = maps([token(match(/struct/)), identifier, parens(many(identifier))],
		  (_, name, fields) => new ast.struct(name, fields));

let macro = binds([token(match(/macro/)), expression, token(match(/:=/)), expression],
		  (_, pattern, __, body) => input => {
		      let m = new ast.macro(pattern, body);
		      let res = success(input, m);
		      res.state = { ...res.state, macros: [...(res.state.macros||[]), m]};
		      return res;
		  });

let declaration = one_of([definition, struct, macro, antiquote]);

let toplevel =
    maps([many(maps([declaration, token(char(';'))], decl => decl)), match(/\W*/)],
	 (decls, _) => decls);

module.exports = {
    toplevel, declaration, definition, expression, identifier, application, string, string_char
};
