let {struct} = require('./interpreter');

let builtins = {
    add: (a, b) => a + b,
    print: x => console.log(x),
    true: () => struct('true', [], builtins),
    false: () => struct('false', [], builtins)
};

module.exports = builtins;
