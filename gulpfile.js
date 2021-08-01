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
gulp.task('check', function(done){
  console.log({
    "Target Dir": getDir(),
    "setting": grabWorkSetting(),
  });
  done();
});

// Sass tasks
gulp.task('sass', function () {
  return gulp.src([ src + '/scss/print.scss'])
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
});

// Pug task
gulp.task('pug', function (done) {
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
      authorName: getProp('authorName'),
      workTitle: getProp('workTitle'),
      direction: getProp( 'direction') || 'tb',
      charLimit: getProp( 'char' ) || 0,
      lineLimit: getProp( 'line' ) || 0,
      year: getProp('year') || (new Date()).getFullYear(),
    });
    fs.writeFile( getDir() + '/html/index.html', html, function (err) {
      if (err) {
        throw err;
      }
      done();
    });
  });
});

// Imagemin
gulp.task('imagemin', function () {
  return gulp.src(getDir() + '/manuscripts/images/**/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use        : [pngquant()]
    }))
    .pipe(gulp.dest( getDir() + '/html/images'));
});

// watch print
gulp.task('sync:print', function () {
  return browserSync.init({
    files : [ getDir() + "/html/**/*"],
    server: {
      baseDir: getDir() + "/html",
      index  : "index.html"
    },
    reloadDelay: 2000
  });
});

gulp.task('reload', function () {
  return browserSync.reload();
});

gulp.task('js', function(){
  return gulp.src( src + '/js/**/*')
    .pipe(gulp.dest( getDir() + '/html/js'));
});

// watch
gulp.task('watch', function (done) {
  // Make SASS
  gulp.watch([ src + '/scss/**/*.scss'], gulp.task('sass'));
  // Copy JS
  gulp.watch([ src + '/js/**/*.js'], gulp.task('js'));
  // HTML
  gulp.watch(
    [
      getDir() + '/manuscripts/**/*.(md|txt)',
      src + '/templates/**/*.pug',
      getDir() + '/setting.json',
    ],
    gulp.task('pug')
  );
  // Minify Image
  gulp.watch(getDir() + 'manuscripts/images/**/*', gulp.task('imagemin'));
  // Sync browser sync.
  gulp.watch([ getDir() + '/html/**/*' ], gulp.task('reload'));
  done();
});

gulp.task('build', gulp.parallel('pug', 'sass', 'imagemin', 'js'));

gulp.task('server:print', gulp.series('build', 'watch', 'sync:print'));

