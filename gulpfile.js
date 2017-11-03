let gulp = require("gulp");
// var requireDir = require("require-dir");

let paths = {
    js: [
        "gulpfile.js",
        "index.js",
        "app/*.js"
    ]
};

// Require all tasks in the 'gulp' folder.
// requireDir("./gulp", {recurse: false});

let eslint = require("gulp-eslint");
let reporter = require("eslint-bamboo-formatter");

gulp.task("lint", function() {
    return gulp.src(paths.js)
        .pipe(eslint())
        .pipe(eslint.format(reporter));
});

gulp.task("eslint", function() {
    gulp.src(paths.js)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

let nodemon = require("gulp-nodemon");
gulp.task("nodemon", function(cb) {
    let started = false;

    nodemon({
        script: "index.js"
    }).on("start", function() {
        if (!started) {
            cb();
            started = true;
        }
    });
});

gulp.task("default", ["nodemon"]);
