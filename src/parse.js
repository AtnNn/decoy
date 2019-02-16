let trace = (...args) => {
    console.log('trace:', ...args);
    return args[args.length - 1];
};

let repr = x => {
    return JSON.stringify(x.toString('utf8'));
};

// input: data, position, scope, state
// result: position, value, state
// failed: failed. position, reason

let scoped = (parser, input, scope) => parser({...input, scope: {...input.scope, ...scope}});

let seek = (input, position) => ({...input, position});

let update = (input, result) => ({ ...input, position: result.position, state: result.state });

let success = (input, value) => ({value, position: input.position, state: input.state});

let failed = (input, reason) => ({failed: true, position: input.position, reason});

let tracep = (name, parser) => input => {
    let indent = '  '.repeat(input.scope.traceIndent);
    console.log(indent + 'parser', name, 'at', repr(input.data.slice(input.position, input.position+10)), '('+input.position+')');
    let res = scoped(parser, input, {traceIndent: (input.scope.traceIndent||0) + 1});
    if (res.failed) {
	console.log(indent + 'parser', name, 'failed:\n ', res.reason.replace(/^|\n/g, x => x + indent));
	return res;
    }
    console.log(indent + 'parser', name, 'returned', res.value, 'from', repr(input.data.slice(input.position, res.position)));
    return res;
};

let match = regex => input => {
    new_regex = RegExp(regex.source, regex.flags + 'y');
    new_regex.lastIndex = input.position;
    let res = new_regex.exec(input.data);
    if (!res) {
	return failed(input, 'match: could not match /' + regex.source + '/' + regex.flags);
    }
    return success(seek(input, new_regex.lastIndex), res[0]);
};

let many = parser => input => {
    let value = [];
    let current = {...input};
    while (true) {
	let res = parser(current);
	if (res.failed) {
	    return success(current, value);
	}
	value.push(res.value);
	current = update(current, res);
    }
};

let many1 = parser => maps([parser, many(parser)], (x, xs) => [x, ...xs]);

let one_of = parsers => input => {
    if (parsers === []) {
	return failed(input, 'one_of: no parsers!');
    }
    let reasons = [];
    for (let parser of parsers) {
	let res = parser(input);
	if (!res.failed) {
	    return res;
	}
	reasons.push('at ' + res.position + ': ' + res.reason);
    }
    return failed(input, 'one_of: none of the parsers matched:\n  ' + reasons.map(r => r.replace(/^|\n/g, x => x + '  ')).join('\n  '));
};

let or_else = (a, b) => input => {
    let res = a(input);
    if (!res.failed) {
	return res;
    }
    return b(input);
};

let bind = (parser, f) => input => {
    let res = parser(input);
    if (res.failed) {
	return res;
    }
    let next = f(res.value);
    return next(update(input, res));
};

let map = (parser, f) => input => {
    let res = parser(input);
    if (res.failed) {
	return res;
    }
    let value = f(res.value);
    return {...res, value};
};

let digit = match(/[0-9]/);

let sequence = parsers => input => {
    let values = [];
    let current = {...input};
    for (let parser of parsers) {
	let res = parser(current);
	if (res.failed) {
	    return res;
	}
	values.push(res.value);
	current = update(current, res);
    }
    return success(current, values);
};

let binds = (parsers, f) => bind(sequence(parsers), res => f.apply(null, res));

let maps = (parsers, f) => map(sequence(parsers), res => f.apply(null, res));

let any = match(/[^]/);

let value = val => input => success(input, val);

let fail = reason => input => failed(input, reason);

let char = expect => bind(any, next => {
    if (expect == next) {
	return value(next);
    }
    return fail("char: expected '" + expect + "'");
});

let complete = parser => input => {
    let res = parser(input);
    if (res.failed) {
	return res;
    }
    if (res.position !== input.data.length) {
	return failed(res, 'complete: expected end of input');
    }
    return res;
};

let lazy = parser => input => parser()(input);

module.exports = {
    many, many1, failed, one_of, or_else, sequence, char, digit, match, complete, any, lazy,
    value, fail, bind, map, binds, maps, tracep
};
