var url = require('url');
var fs = require('fs');
var path = require('path');
var pkg = require('./package.json');

var gulp = require('gulp');
var less = require('gulp-less');
var gulpif = require('gulp-if');
var rename = require('gulp-rename');
var header = require('gulp-header');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var minify = require('gulp-minify-css');
var minifyhtml = require('gulp-minify-html');
var htmlreplace = require('gulp-html-replace');
var livereload = require('gulp-livereload');
var webserver = require('gulp-webserver');

var headerTpl = '/** kitadmin-v${version} ${license} License By ${homepage} Author ${author} */\n';
var headerData = pkg;

//web服务器 用于开发环境
gulp.task('webserver', function () {
  gulp.src('./src/') // 服务器目录（./代表根目录）
    .pipe(webserver({ // 运行gulp-webserver
      port: 8088, //端口，默认8000
      livereload: true, // 启用LiveReload
      open: true, // 服务器启动时自动打开网页
      directoryListing: {
        enable: true,
        path: 'index.html' //配置默认访问页面
      },
      middleware: function (req, res, next) {
        //mock local data
        var urlObj = url.parse(req.url, true),
          method = req.method;
        if (!urlObj.pathname.match(/^\/api/)) { //不是api开头的数据，直接next
          next();
          return;
        }
        var mockDataFile = path.join(__dirname, urlObj.pathname) + ".js";
        //file exist or not
        fs.access(mockDataFile, fs.F_OK, function (err) {
          if (err) {
            // res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              "status": "没有找到此文件",
              "notFound": mockDataFile
            }));
            return;
          }
          var data = fs.readFileSync(mockDataFile, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(data);
        });
        next();
      },
      proxies: []
    }));
});
// 编译less
gulp.task('less', function () {
  return gulp.src(['./src/less/*.less'])
    // .pipe(gulpif(['!app.less', '!menu.less'], less()))
    .pipe(less())
    .pipe(gulp.dest('./src/css/'));
});
// 打包layui
gulp.task('kitadmin', function () {
  return gulp.src(['./src/lib/kitadmin/**/*.*', './src/lib/kitadmin/*.*'])
    .pipe(gulp.dest('./dist/lib/kitadmin'));
});
// 打包js
gulp.task('js', function () {
  // 打包自定义的js模块
  return gulp.src(['./src/js/*.js'])
    // .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['env']
    }))
    .pipe(uglify())
    .pipe(header(headerTpl + ';', headerData))
    // .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/js'));
});
// 打包css ,打包之前先编译less
gulp.task('css', ['less'], function () {
  return gulp.src(['./src/css/*.css'])
    .pipe(minify())
    .pipe(header(headerTpl, headerData))
    .pipe(gulp.dest('./dist/css'));
});
// 打包html
gulp.task('html', function () {
  gulp.src('./src/mockjs/*.js')
    .pipe(gulp.dest('./dist/example'));

  return gulp.src('./src/index.html')
    // .pipe(htmlreplace({
    //   js: ['../polyfill.min.js', '../layui.js', '../kitadmin.js', 'mockjs-config.js'],
    //   css: ['../css/layui.css', '../css/app.css'],
    //   use: '<script>layui.use("admin");</script>'
    // }))
    .pipe(gulp.dest('./dist'));
});
// 打包views
gulp.task('views', function () {
  return gulp.src(['./src/views/**/*.*'])
    // .pipe(minifyhtml())
    .pipe(gulp.dest('./dist/views'));
});
// 运行打包任务
gulp.task('build', ['kitadmin', 'js', 'css', 'html', 'views'],function(){
  process.exit();
});
// 监听less文件的变更进步热编译
var watcher = gulp.watch(['./src/less/*.less'], ['less']);
watcher.on('change', function (event) {
  console.log('LESS ' + event.path + ' was ' + event.type + ', running tasks.');
});
// 启动本地服务器
gulp.task('dev', ['less', 'webserver']);
// 默认任务
gulp.task('default', function () {
  console.log('default.');
});