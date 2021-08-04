#!/usr/bin/env node
const fs = require( 'fs' );
const { spawn } = require( 'child_process' );
const { server, build, getDir, getProp } = require( './gulpfile' );


const subcommand = process.argv[ 2 ];
const src = getDir() + '/html/index.html';

const pad = ( number ) => {
	return ( '0' + number ).slice( -2 );
};

const runCommand = ( cmd, args ) => {
	const stream = spawn( cmd, args );
	stream.stdout.on('data', ( data ) => {
		console.log( data.toString().trim() );
	});

	stream.stderr.on('data', ( data ) => {
		console.error( data.toString().trim() );
	});

	stream.on('close', (code) => {
		console.log( `Print job exited with code ${code}` );
	});
	return stream;
}

switch ( subcommand ) {
	case 'init':
		fs.copyFile( __dirname + '/setting-sample.json', './setting.json', ( err ) => {
			if ( err ) {
				console.error( err );
			} else {
				console.log( 'setting.jsonをコピーしました。編集してください。' );
			}
		} );
		break;
	case 'build':
		build();
		break;
	case 'print':
		// Check source dir.
		if ( !fs.existsSync( src ) ) {
			throw new Error( 'HTMLファイルが存在しません: ' + src );
		}
		// Check dir.
		let version = process.argv[ 3 ];
		let fileName;
		if ( version ) {
			fileName = getProp( 'workTitle' ) + '_' + version + '.pdf';
		} else {
			const today = new Date();
			version = today.getFullYear() + pad( today.getMonth() + 1 ) + pad( today.getDay() ) + pad( today.getHours() ) + pad( today.getMinutes() ) + pad( today.getSeconds() );
			fileName = 'tmp_' + version + '.pdf';
		}
		const targetDir = getDir() + '/snapshots';
		if ( !fs.existsSync( targetDir ) ) {
			fs.mkdirSync( targetDir )
			if ( !fs.existsSync( targetDir ) ) {
				console.error( 'ディレクトリを作成できませんでした。' );
				return;
			}
		}
		// Save
		const path = targetDir + '/' + fileName;
		runCommand( 'vivliostyle', [ 'build', '-s', 'A4', '-d', '-o', path, src ] );
		break;
	case 'preview':
		// Check source dir.
		if ( !fs.existsSync( src ) ) {
			throw new Error( 'HTMLファイルが存在しません: ' + src );
		}
		runCommand( 'vivliostyle', [ 'preview', '-s', 'A4', '-d', src ] );
		break;
	default:
		server();
		break;
}
