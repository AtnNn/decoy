let fs = require('fs');
let ast = require('./ast');
let interpreter = require('./interpreter');
let {many, many1, failed, one_of, or_else, sequence, char, digit, match, lazy,
     value, bind, map, binds, maps, tracep, try_, backtracking_one_of, success} = require('./parse');

let trace = (...args) => {
    console.log('trace:', ...args);
    return args[args.length - 1];
};

let start = (data, globals) => {
    return {
	data,
	state: {globals, locals: {}},
	scope: {},
	position: 0
    };
};

let id_char1 = match(/[a-z_]/i);

let id_char = or_else(id_char1, digit);

let empty_space = match(/\s*/);

let token = parser => maps([parser, empty_space], (x, _) => x);

let dollar = token(match(/\$/));

let identifier =
    token(maps([id_char1, many(id_char)], (x, xs) =>
	       ast.mk_identifier(x + xs.join(''))));

let number = token(map(match(/[0-9]+/), n => ast.mk_number(BigInt(n))));

let string_char = one_of([
    match(/[^\\"\n]/),
    maps([match(/\\/), one_of([
	map(match(/n/), () => '\n'),
	map(match(/r/), () => '\r'),
	map(match(/t/), () => '\t'),
	map(match(/\\/), () => '\\'),
	map(match(/"/), () => '"')])], (_, c) => c)]);

let string = token(maps([char('"'), many(string_char),  char('"')],
			(_, chars, __) => ast.mk_string(chars.join(''))));

let literal = one_of([number, string]);

let atom = one_of([identifier, literal]);

let parens = parser =>
    maps([token(char('(')),  parser, token(char(')'))],
	 (_, x, __) => x);

let binding_application =
    parens(maps([identifier, lazy(() => bindings)],
		(x, xs) => ast.mk_application([x, ...xs])));

let bindings = many1(backtracking_one_of([lazy(() => quote), identifier, binding_application]));

let lambda =
    maps([bindings, token(match(/->/)), lazy(() => expression)],
	 (params, _, body) => ast.mk_lambda(params, body));

let expression = backtracking_one_of([lambda, lazy(() => application), lazy(() => expression1)]);

let many2 = parser =>
    maps([parser, parser, many(parser)],
	 (x, y, xs) => [x, y, ...xs]);

let application = map(many2(lazy(() => expression1)), es => ast.mk_application(es));

let case_ = maps([bindings, token(char(':')), expression, token(char(';'))],
		 (pattern, _, body, __) => ast.mk_case(pattern, body));

let switch_ = maps([token(match(/switch/)), parens(expression), many(case_)],
		    (_, val, cases) => ast.mk_switch(val, cases));

let quote = maps([token(match(/\$\{/)), lazy(() => backtracking_one_of([declaration, expression])), token(match(/}/))], (_, x, __) => ast.mk_quote(x));

let antiquote = binds([dollar, lazy(() => expression1)], (_, x) => input => success(ast.mk_antiquote(x, {...input.state.globals, ...input.state.locals}))(input));

let expression2 =
    maps([one_of([try_(atom), parens(lazy(() => expression))]),
	  many(maps([token(char('.')), identifier], (_, n) => n))],
	(expr, accesses) => {
	    for (let name of accesses) {
		expr = ast.mk_access(expr, name);
	    }
	    return expr;
	});

let expression1 = one_of([try_(switch_), quote, antiquote, expression2]);

let definition =
    maps([expression, token(match(/:=/)), expression],
	 (id, _, val) => ast.mk_declaration(id, val));

let struct = maps([token(match(/struct/)), identifier, parens(many(identifier))],
		  (_, name, fields) => ast.mk_struct(name, fields));

let declaration = backtracking_one_of([struct, antiquote, definition]);

let toplevel =
    maps([empty_space, many(binds([declaration, token(char(';'))], (decl, _) => extend_env(decl)))],
	 (_, __) => null);

let extend_env = decl => input => {
    let env = { ...input.state.globals, ...input.state.locals };
    let decls = expand_decl(decl, env);
    let new_env = interpreter.eval_defs(decls, env);
    let res = success(null)(input);
    res.state.locals = { ...res.state.locals, ...new_env };
    return res;
};

let expand_decl = (decl, env) => {
    if (ast.is_antiquote(decl)) {
	return [eval(decl.fields.expression, env)];
    }
    return [decl];
};

module.exports = {
    toplevel, declaration, definition, expression, identifier, application, string, string_char, start
};
