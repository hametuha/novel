const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const fs = require('fs');
const mergeStream = require('merge-stream');
const pug = require('pug');
const MarkdonwIt = require('markdown-it');
const mkdirp = require('mkdirp');
const pngquant = require('imagemin-pngquant');
const browserSync = require('browser-sync').create();
const _ = require('lodash');

const md = (new MarkdonwIt())
  .use(require('markdown-it-deflist'))
  .use(require('markdown-it-ruby'));

const src = __dirname + '/src';

/**
 * Get target directory
 *
 * @return {String}
 */
function getDir(){
  return (process.env.TARGET || process.cwd() ).replace(/\/$/, '');
}

/**
 * Convert content
 *
 * @param {String} content
 * @returns {String}
 */
function convert( content ) {
  // Ruby
  content = content.replace(/{([^}]*)}/g, function(match, regexp){
    // Save mathematic function.
    return match.replace('|', '\|');
  });
  content = content.replace( /\|([^<]*)<([^>]*)>/g, "{$1|$2}" );
  // Convert markdown to HTML.
  content = md.render(content);
  content = replaceTags(content);
  return content;
}

/**
 * Convert figure tag.
 *
 * @param {String} html
 * @return {String}
 */
function replaceTags(html){
  const replaces = {
      '<figure><img$1$3><figcaption>$2</figcaption></figure>': /<p><img([^>]*)alt="(.*?)"([^>]*)><\/p>/mg,
      '<p style="text-align:right;">$1</p>': /<p>-&gt;(.*?)<\/p>/g
  };
  for ( const replaced in replaces ) {
      if ( ! replaces.hasOwnProperty( replaced ) ) {
          continue;
      }

      html = html.replace( replaces[ replaced ], replaced );
  }
  return html;
}

/**
 * Get work setting.
 */
function grabWorkSetting() {
  let json = fs.readFileSync( getDir() + '/setting.json', 'utf8');
  if(!json){
    return json;
  }else{
    return JSON.parse(json);
  }
}

/**
 * Get setting property
 *
 * @param name
 * @returns {string}
 */
function getProp(name){
  return _.get(grabWorkSetting(), name) || '';
}

/**
 * Get setting.
 */
const check = function(done){
  console.log({
    "Target Dir": getDir(),
    "setting": grabWorkSetting(),
  });
  done();
};

// Sass tasks
const sass = function () {
  return gulp.src( [
      src + '/scss/*.scss',
      ! + src + '/scss/_*.scss',
  ])
    .pipe($.plumber({
      errorHandler: $.notify.onError('<%= error.message %>')
    }))
    .pipe($.sass({
      errLogToConsole: true,
      outputStyle    : 'compressed',
      includePaths   : [
        src + '/scss'
      ]
    }))
    .pipe($.autoprefixer({

    }))
    .pipe(gulp.dest( getDir() + '/html/css'));
};

// Pug task
const html = (done) => {
  let compiler = pug.compileFile( src + '/templates/index.pug');
  const dir = getDir();
  fs.readdir( dir + '/manuscripts', function (err, files) {
    if(err){
      throw err;
    }
    let tocs = [];
    let contents = [];
    // Compile all html.
    files.filter(function (file) {
      return /^\d{2}_(.*)\.(md|txt)$/.test(file);
    }).map(function (file, index) {
      const id = file.replace(/\.(md|txt)/, '');
      // Create HTML
      let content = fs.readFileSync( dir + '/manuscripts/' + file).toString();
      content = convert( content );
      contents.push({
        id  : id,
        html: content,
      });
      const title = file.match(/^\d+_(.*)\.(md|txt)$/m);
      tocs.push({
        title: title[1],
        target: getProp(`target[${index}]`),
        id: id,
      });
    });
    // Save html
    const html = compiler({
      toc     : tocs,
      contents: contents,
      authorName: getProp('author'),
      workTitle: getProp('title'),
      direction: getProp( 'direction') || 'tb',
      charLimit: getProp( 'char' ) || 0,
      lineLimit: getProp( 'line' ) || 0,
      year: getProp('year') || (new Date()).getFullYear(),
    });
    // If directory not exists, create one.
    const htmlDir = getDir() + '/html';
    if ( ! fs.existsSync( htmlDir ) ) {
      fs.mkdirSync( htmlDir );
    }
    // Write files.
    fs.writeFile( getDir() + '/html/index.html', html, function (err) {
      if (err) {
        throw err;
      }
      done();
    });
  });
};

/**
 * Render HTML contents from template
 *
 * @param {object} variables Variables for template.
 * @param {string} template Template file path.
 * @returns {string} HTML string.
 */
const htmlTemplate = function ( variables, template ) {
    let compiler = pug.compileFile(template);
    return compiler( variables );
}

/**
 * Compile markdown to HTML
 *
 * @param {object} variables Variables for template.
 * @param {string} template Template file path.
 * @param {string} markdown Markdown file path.
 * @param {boolean} skip_convert Skip convert markdown to HTML.
 * @param {function} callback Callback function.
 * @returns {string} HTML string.
 */
const compileFromMarkDown = function( variables, template, markdown, skip_convert = false, callback=null ) {
    let content = fs.readFileSync( markdown).toString();
    if ( callback ) {
        content = callback( content );
    }
    if ( ! skip_convert ) {
        content = convert( content );
    }
    variables.content = content;
    return htmlTemplate( variables, template );
}

// Imagemin
const imagemin = function () {
  return gulp.src(getDir() + '/manuscripts/images/**/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use        : [pngquant()]
    }))
    .pipe(gulp.dest( getDir() + '/html/images'));
};

// watch print
const bs = function () {
  return browserSync.init({
    files : [ getDir() + "/html/**/*"],
    server: {
      baseDir: getDir() + "/html",
      index  : "index.html"
    },
    reloadDelay: 2000
  });
};

const reload = function () {
  return browserSync.reload();
};

const js = function(){
  return gulp.src( src + '/js/**/*')
    .pipe(gulp.dest( getDir() + '/html/js'));
};

// watch
const watch = function (done) {
  // Make SASS
  gulp.watch([ src + '/scss/**/*.scss'], sass);
  // Copy JS
  gulp.watch([ src + '/js/**/*.js'], js);
  // HTML
  gulp.watch(
    [
      getDir() + '/manuscripts/**/*.(md|txt)',
      src + '/templates/**/*.pug',
      getDir() + '/setting.json',
    ],
    html
  );
  // Minify Image
  gulp.watch(getDir() + 'manuscripts/images/**/*', imagemin );
  // Sync browser sync.
  gulp.watch([ getDir() + '/html/**/*' ], reload );
  done();
};

const build = gulp.parallel( html, sass, imagemin, js );

const server = gulp.series( build, watch, bs );

exports.getDir = getDir;
exports.getProp = getProp;
exports.check = check;
exports.sass = sass;
exports.js = js;
exports.html = html;
exports.imagemin = imagemin;
exports.bs = bs;
exports.reload = reload;
exports.watch = watch;
exports.build = build;
exports.server = server;
exports.htmlTemplate = htmlTemplate;
exports.compileFromMarkDown = compileFromMarkDown;
