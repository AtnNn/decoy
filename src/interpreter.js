let ast = require('./ast');
let {record} = require('./data');

let eval_defs = (defs, initial_env) => {
    let env = {...initial_env};
    for (let def of defs) {
	if (ast.is_struct(def)) {
	    env[def.fields.name.fields.name] = struct(def.fields.name.fields.name, def.fields.fields.map(x => x.fields.name), env);
	} else if (ast.is_declaration(def)) {
	    env[def.fields.lhs.fields.name] = () => eval(def.fields.rhs, env);
	} else {
	    throw new Error('unknown def');
	}
    }
    return env;
};

let eval = (expr, env) => {
    if (ast.is_identifier(expr)) {
	return env[expr.fields.name];
    }
    if (ast.is_number(expr)) {
	return expr.fields.value;
    }
    if (ast.is_string(expr)) {
	return expr.fields.value;
    }
    if (ast.is_application(expr)) {
	return call(expr.fields.children.map(x => eval(x, env)));
    }
    if (ast.is_lambda(expr)) {
	return lambda(expr.fields.params, expr.fields.body, env);
    }
    if (ast.is_switch(expr)) {
	return switch_(eval(expr.fields.value, env), expr.fields.cases, env);
    }
    if (ast.is_quote(expr)) {
	return quasiquote(expr.fields.ast, env);
    }
    if (ast.is_antiquote(expr)) {
	return eval(strict(eval(expr.fields.expression, expr.fields.parse_env)), env);
    }
    console.log('invalid:', expr);
    throw new Error('invalid expression');
};

let call = exprs => {
    let fun = strict(exprs[0])
    let args = exprs.slice(1);
    while (args.length > 0) {
	let n = Math.min(fun.length, args.length);
	fun = fun.apply(undefined, args.slice(0, n));
	args = args.slice(n);
    }
    return fun;
};

let strict = f => {
    while (f instanceof Function && f.length == 0) {
	f = f();
    }
    return f;
};

let lambda = (params, body, env) => {
    params = [...params];
    params.reverse();
    let fun = env => eval(body, env);
    for (let param of params) {
	let nextf = fun;
	fun = env => x => {
	    let res = match(param, x);
	    if (res.failed) {
		throw new Error('failed match: ' + res.reason);
	    }
	    return nextf({...env, ...res.env});
	};
    }
    return fun(env);
};

let struct = (name, infields, env) => {
    fields = [...infields];
    fields.reverse();
    let fun = obj => new record(name, obj, infields);
    for (let field of fields) {
	let nextf = fun;
	fun = obj => x => nextf({...obj, [field]: x});
    }
    return fun({});
};

let match = (pattern, val) => {
    if (ast.is_quote(pattern)) {
	pattern = quote_binding(pattern.fields.ast);
    }
    val = strict(val);
    if (ast.is_identifier(pattern)) {
	return { env: { [pattern.fields.name]: val } };
    }
    if (ast.is_application(pattern)) {
	if(val instanceof record && val.name === pattern.fields.children[0].fields.name) {
	    let params = pattern.fields.children.slice(1);
	    if (params.length != val.field_names.length) {
		return {
		    failed: true,
		    reason: "param count mismatch in " + val.name};
	    }
	    let env = {};
	    for (let i in params) {
		let res = match(params[i], val.fields[val.field_names[i]]);
		if (res.failed) {
		    return res;
		}
		env = { ...env, ...res.env };
	    }
	    return {env};
	}
	return {
	    failed: true,
	    reason: val.name + " does not match " + pattern.fields.children[0].fields.name
	};
    }
    if (typeof(pattern) === 'bigint' || typeof(pattern) === 'string') {
	if (val === pattern) {
	    return {env: {}};
	}
	return {failed: true,
		reason: val + " !== " + pattern};
    }
    if (Array.isArray(pattern)) {
	if (!Array.isArray(val)) {
	    return {failed: true,
		    reason: 'expected array'};
	}
	if (pattern.length != val.length) {
	    return {failed: true,
		    reason: 'expected arrays of same length'};
	}
	let env = {};
	for (let index in pattern) {
	    let res = match(pattern[index], val[index]);
	    if (res.failed) {
		return res;
	    }
	    env = { ...env, ...res.env };
	}
	return {env};
    }
    console.log('invalid pattern:', pattern);
    throw new Error('invalid pattern');
}

let switch_ = (value, cases, env) => {
    for (let case_ of cases) {
	let res = match(case_.fields.pattern[0], value);
	if (!res.failed) {
	    return eval(case_.fields.body, { ...env, ...res.env });
	}
    }
    throw new Error('no matching case');
};

let quote_binding = quoted => {
    let q = quote_binding;
    let app = (name, ...args) => {
	return ast.mk_application([ast.mk_identifier(name), ...args]);
    };
    if (ast.is_antiquote(quoted)) {
	return quoted.fields.expression;
    }
    if (ast.is_declaration(quoted)) {
	return app('declaration', q(quots.fields.lhs), q(quots.fields.rhs));
    }
    if (ast.is_application(quoted)) {
	return app('application', quoted.fields.children.map(q));
    }
    if (ast.is_number(quoted)) {
	return app('number', quoted.fields.value)
    }
    if (ast.is_string(quoted)) {
	return app('string', quoted.fields.value)
    }
    if (ast.is_lambda(quoted)) {
	return app('lambda', quoted.fields.params.map(q), q(quoted.fields.body));
    }
    if (ast.is_struct(quoted)) {
	return app('struct', q(quoted.fields.name), quoted.fields.fields.map(q));
    }
    if (ast.is_switch(quoted)) {
	return app('switch', q(quoted.fields.value), quoted.fields.cases.map(q));
    }
    if (ast.is_case(quoted)) {
	return app('case', q(quoted.fields.pattern), q(quoted.fields.value));
    }
    if (ast.is_quote(quoted)) {
	return app('quote', quote(quoted.fields.ast,
				  antiquoted => {
				      throw new Error("nested quote binding with antiquote not implemented");
				  }));
    }
    if (ast.is_identifier(quoted)) {
	return app('identifier', quoted.fields.name);
    }
    throw new Error('quote_binding: unknown syntax');
};

let quasiquote = (quoted, env) => {
    let q = syntax => quasiquote(syntax, env);
    if (ast.is_antiquote(quoted)) {
	return eval(quoted.fields.expression, env);
    }
    if (ast.is_declaration(quoted)) {
	return mk_declaration(q(quots.fields.lhs), q(quots.fields.rhs));
    }
    if (ast.is_application(quoted)) {
	return ast.mk_application(quoted.fields.children.map(q));
    }
    if (ast.is_number(quoted)) {
	return quoted;
    }
    if (ast.is_string(quoted)) {
	return quoted;
    }
    if (ast.is_lambda(quoted)) {
	return ast.mk_lambda(quoted.fields.params.map(q), q(quoted.fields.body));
    }
    if (ast.is_struct(quoted)) {
	return ast.mk_struct(q(quoted.fields.name), quoted.fields.fields.map(q));
    }
    if (ast.is_switch(quoted)) {
	return ast.mk_switch(q(quoted.fields.value), quoted.fields.cases.map(q));
    }
    if (ast.is_case(quoted)) {
	return ast.mk_case(q(quoted.fields.pattern), q(quoted.fields.value));
    }
    if (ast.is_quote(quoted)) {
	return quoted;
    }
    if (ast.is_identifier(quoted)) {
	return quoted;
    }
    console.log('unkown syntax:', quoted);
    throw new Error('quasiquote: unknown syntax');
};

module.exports = { eval_defs, strict, eval, record };
