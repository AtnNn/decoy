let fs = require('fs');
let ast = require('./ast');
let interpreter = require('./interpreter');
let {many, many1, failed, one_of, or_else, sequence, char, digit, match, lazy,
     value, bind, map, binds, maps, tracep, try_, backtracking_one_of, success} = require('./parse');

let trace = (...args) => {
    console.log('trace:', ...args);
    return args[args.length - 1];
};

let start = (data, env, path) => {
    return {
	data,
	scope: { env },
	state: {
	    loc: { path, line: 0, char: 0 },
	},
	position: 0
    };
};

let locate = f => (...args) => input => {
    return success(f(input.state.loc, ...args))(input);
};

let id_char1 = match(/[a-z_]/i);

let id_char = or_else(id_char1, digit);

let empty_space = match(/\s*/);

let token = parser => maps([parser, empty_space], (x, _) => x);

let dollar = token(match(/\$/));

let identifier =
    token(binds([id_char1, many(id_char)], (x, xs) =>
		 locate(ast.mk_identifier)(x + xs.join(''))));

let number = token(bind(match(/[0-9]+/), n => locate(ast.mk_number)(BigInt(n))));

let string_char = one_of([
    match(/[^\\"\n]/),
    maps([match(/\\/), one_of([
	map(match(/n/), () => '\n'),
	map(match(/r/), () => '\r'),
	map(match(/t/), () => '\t'),
	map(match(/\\/), () => '\\'),
	map(match(/"/), () => '"')])], (_, c) => c)]);

let string = token(binds([char('"'), many(string_char),  char('"')],
			(_, chars, __) => locate(ast.mk_string)(chars.join(''))));

let literal = one_of([number, string]);

let atom = one_of([identifier, literal]);

let parens = parser =>
    maps([token(char('(')),  parser, token(char(')'))],
	 (_, x, __) => x);

let binding_application =
    parens(binds([identifier, lazy(() => bindings)],
		 (x, xs) => locate(ast.mk_application)([x, ...xs])));

let bindings = many1(backtracking_one_of([lazy(() => quote), identifier, binding_application]));

let lambda =
    binds([bindings, token(match(/->/)), lazy(() => expression)],
	  (params, _, body) => locate(ast.mk_lambda)(params, body));

let expression = backtracking_one_of([lambda, lazy(() => application), lazy(() => expression1)]);

let many2 = parser =>
    maps([parser, parser, many(parser)],
	 (x, y, xs) => [x, y, ...xs]);

let application = bind(many2(lazy(() => expression1)), es => locate(ast.mk_application)(es));

let switch_ = binds([token(match(/switch/)), parens(expression), many(maps([lambda, token(match(/;/))], (case_, _) => case_))],
		   (_, val, cases) => locate(ast.mk_switch)(val, cases));

let quote = binds([token(match(/\$\{/)), lazy(() => backtracking_one_of([declaration, expression])), token(match(/}/))], (_, x, __) => locate(ast.mk_quote)(x));

let antiquote = binds([dollar, lazy(() => expression1)], (_, x) => input => locate(ast.mk_antiquote)(x, input.scope.env)(input));

let expression2 =
    binds([one_of([try_(atom), parens(lazy(() => expression))]),
	  many(maps([token(char('.')), identifier], (_, n) => n))],
	(expr, accesses) => input => {
	    for (let name of accesses) {
		expr = ast.mk_access(input, expr, name);
	    }
	    return success(expr)(input);
	});

let expression1 = one_of([try_(switch_), quote, antiquote, expression2]);

let definition =
    binds([expression, token(match(/:=/)), expression],
	  (id, _, val) => locate(ast.mk_declaration)(id, val));

let struct = binds([token(match(/struct/)), identifier, parens(many(identifier))],
		   (_, name, fields) => locate(ast.mk_struct)(name, fields));

let declaration = backtracking_one_of([struct, antiquote, definition]);

let toplevel =
    maps([empty_space, many(binds([declaration, token(char(';'))], (decl, _) => extend_env(decl)))],
	 (_, declss) => declss.flat());

let extend_env = decl => input => {
    let decls = expand_decl(decl, input.scope.env);
    interpreter.eval_defs(decls, input.scope.env);
    return success(decls)(input);
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
