let { decoy, decoy_import, decoy_define } = require('./decoy');

if (process.argv[2] === "-c") {
    decoy_import(__dirname + '/compiler.decoy');
    decoy_define('process_arguments', process.argv.slice(3));
    decoy('main');
} else {
    decoy_import(process.argv[2]);
    decoy('main');
}
