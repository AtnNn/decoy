let trace = (...args) => {
    console.log('trace:', ...args);
    return args[args.length - 1];
};

let repr = x => {
    return JSON.stringify(x.toString('utf8'));
};

// input: data, position, scope, state
// success: position, value, state
// failed: failed. position, reason

let scoped = (parser, scope) => input => parser({...input, scope: {...input.scope, ...scope}});

let seek = position => input => {
    let prev = input.state.loc;
    let span = input.data.slice(input.position, position);
    let lines = (span.match(/\n/g) || []).length;
    let chars = span.match(/.*$/)[0].length;
    let loc = {
	path: prev.path,
	line: prev.line + lines,
	char: lines ? chars : prev.char + chars
    };
    return {...input, position, state: { ...input.state, loc } }
};

let update = result => input => ({ ...input, position: result.position, state: result.state });

let success = value => input => ({value, position: input.position, state: input.state});

let failed = reason => input => ({failed: true, position: input.position, reason, loc: input.state.loc});

let tracep = (name, parser) => input => {
    let indent = '  '.repeat(input.scope.traceIndent);
    console.log(indent + 'parser', name, 'at', repr(input.data.slice(input.position, input.position+10)), '('+input.position+')');
    let res = scoped(parser, {traceIndent: (input.scope.traceIndent||0) + 1})(input);
    if (res.failed) {
	console.log(indent + 'parser', name, 'failed at ' + res.position +':\n ', res.reason.replace(/^|\n/g, x => x + indent));
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
	return failed('match: could not match /' + regex.source + '/' + regex.flags)(input);
    }
    return success(res[0])(seek(new_regex.lastIndex)(input));
};

let many = parser => input => {
    let value = [];
    let current = {...input};
    while (true) {
	let res = parser(current);
	if (res.failed) {
	    return success(value)(current);
	}
	value.push(res.value);
	current = update(res)(current);
    }
};

let many1 = parser => maps([parser, many(parser)], (x, xs) => [x, ...xs]);

let one_of = parsers => input => {
    if (parsers === []) {
	return failed('one_of: no parsers!')(input);
    }
    let reasons = [];
    for (let parser of parsers) {
	let res = parser(input);
	if (!res.failed) {
	    return res;
	}
	if (res.position > input.position) {
	    return res;
	}
	reasons.push(res.reason);
    }
    return failed('one_of: none of the parsers matched:\n  ' + reasons.map(r => r.replace(/^|\n/g, x => x + '  ')).join('\n  '))(input);
};

let try_ = parser => input => {
    let res = parser(input);
    if (res.failed && res.position !== input.position) {
	return {...res, position: input.position, reason: 'at ' + res.position + ': ' + res.reason};
    }
    return res;
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
    return next(update(res)(input));
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
	current = update(res)(current);
    }
    return success(values)(current);
};

let binds = (parsers, f) => bind(sequence(parsers), res => f.apply(null, res));

let maps = (parsers, f) => map(sequence(parsers), res => f.apply(null, res));

let any = input => {
    if (input.data.length === input.position) {
	return failed('any: no more data')(input);
    }
    return success(input.data[input.position])(seek(input.position + 1)(input))
};

let string = str => input => {
    if (input.data.slice(input.position, input.position + str.length) !== str) {
	return failed('string ' + JSON.stringify(str) + ' not found')(seek(input.data.length + 1)(input));
    }
    return success(str)(seek(input.position + str.length)(input))
};

let char = string;

let complete = parser => input => {
    let res = parser(input);
    if (res.failed) {
	return res;
    }
    if (res.position !== input.data.length) {
	return failed('complete: expected end of input')(update(res)(input));
    }
    return res;
};

let lazy = parser => input => parser()(input);

let backtracking_one_of = parsers => {
    let inits = parsers.slice(0, -1);
    let last = parsers[parsers.length - 1];
    return one_of([...inits.map(p => try_(p)), last]);
};

let pretty_loc = loc => {
    return `${loc.path}:${loc.line}:${loc.char}`;
};

let error_message = res => {
    return `${pretty_loc(res.loc)}: ${res.reason}`;
};

module.exports = {
    many, many1, failed, one_of, or_else, sequence, char, digit, match, complete, any, lazy,
    bind, map, binds, maps, tracep, try_, backtracking_one_of, success, error_message, pretty_loc
};
