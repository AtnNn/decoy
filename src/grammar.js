let fs = require('fs')
let {many, failed, one_of, or_else, parse, sequence, whitespace, char, digit, match} = require('./parse');

let id_char1 = match(/[a-z_]/i);

let expression = match(/bar/);

let id_char = or_else(id_char1, digit);

let identifier =
    parse(id_char1, x =>
	  parse(many(id_char), xs =>
		({value: x + xs.join('')})));

let definition =
    parse(identifier, id =>
	  parse(sequence([whitespace, char("="), whitespace]), () =>
		parse(expression, val => {
		    return {value: [id, val]};
		})));

let declaration = one_of([definition]);

let toplevel = parse(many(declaration), x => parse(whitespace, () => ({value: x})));

module.exports = {
    toplevel, declaration, definition, expression, identifier
};
