#!/usr/bin/env node
const fs = require( 'fs' );
const {server, build} = require('./gulpfile');


const subcommand = process.argv[ process.argv.length - 1 ];

switch ( subcommand ) {
	case 'init':
		fs.copyFile( __dirname + '/setting-sample.json', './setting.json', (err) => {
			if (err) {
				console.error( err );
			} else {
				console.log( 'setting.jsonをコピーしました。編集してください。' );
			}
		});
		break;
	case 'build':
		build();
		break;
	default:
		server();
		break;
}
