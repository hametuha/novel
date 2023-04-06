#!/usr/bin/env node
const fs = require( 'fs' );
const { spawn } = require( 'child_process' );
const { server, build, getDir, getProp, compileFromMarkDown, htmlTemplate } = require( './gulpfile' );


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
    case 'epub':
        const epubSetting = getDir() + '/epub.json';
        if ( !fs.existsSync( epubSetting ) ) {
            throw new Error( 'epub.jsonが存在しません: ' + epubSetting );
        }
        const epub = JSON.parse( fs.readFileSync( epubSetting ) );
        if ( ! fs.existsSync( epub.dest ) ) {
            fs.mkdirSync( epub.dest, { recursive: true } );
        }
        epub.pages.forEach( ( page ) => {
            const dest = epub.dest + '/' + page.name;
            console.log( `${page.name}を生成します……` );
            // Merge stylesheet.
            const styles = epub.styles
            page.data.direction = page.data.direction || epub.direction;
            page.data.lang = page.data.lang || epub.lang;
            if ( styles.length ) {
                if ( page.data.styles ) {
                    styles.map( ( style ) => {
                        page.data.styles.push( style );
                    } );
                } else {
                    page.data.styles = styles;
                }
            }
            // Seek template.
            if ( ! fs.existsSync( page.template ) ) {
                page.template = __dirname + '/src/templates/' + page.template;
            }
            let output;
            if ( page.source ) {
                // Should read from file.
                output = compileFromMarkDown( page.data, page.template, page.source, !!page.raw );
            } else {
                // Render pug.
                output = htmlTemplate( page.data, page.template );
            }
            fs.writeFileSync( dest, output );
        } );
        console.log( 'ePub用のHTMLを生成しました.' );
        break;
	default:
		server();
		break;
}
