let { decoy, decoy_import } = require('./decoy');


decoy_import(process.argv[2]);
decoy('main');
