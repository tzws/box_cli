"use strict";
var fs = require("fs");
var glob = require("glob");
var optimist = require("optimist");
var path = require("path");
var minify = require('html-minifier').minify;
var tt = require('dont');
var UglifyJS = require("uglify-js");
var Linter = require("eslint").Linter;

var processed = optimist
    .usage("Usage: $0 [options] file ...")
    .check(function (argv) {
        if (!(argv.i || argv.d || argv._.length > 0)) {
            // if (argv._.length == 0) {
            throw "Missing files";
        }
    })
    .options({
        "c": {
            alias: "config",
            describe: "configuration file",
        },
        "force": {
            describe: "return status code 0 even if there are lint errors",
            "type": "boolean",
        },
        "h": {
            alias: "help",
            describe: "display detailed help",
        },
        "i": {
            alias: "init",
            describe: "generate a tslint.json config file in the current working directory",
        },
        "o": {
            alias: "out",
            describe: "output file",
        },
        "r": {
            alias: "rules-dir",
            describe: "rules directory",
        },
        "s": {
            alias: "formatters-dir",
            describe: "formatters directory",
        },
        "e": {
            alias: "exclude",
            describe: "exclude globs from path expansion",
        },
        "t": {
            alias: "format",
            default: "prose",
            describe: "output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso)",
        },
        "v": {
            alias: "version",
            describe: "current version",
        },
    });
var argv = processed.argv;
var outputStream;
if (argv.o != null) {
    outputStream = fs.createWriteStream(argv.o, {
        flags: "w+",
        mode: 420,
    });
} else {
    outputStream = process.stdout;
}
if (argv.v != null) {
    outputStream.write(Linter.VERSION + "\n");
    process.exit(0);
}
// if (argv.i != null) {
//     if (fs.existsSync(configuration_1.CONFIG_FILENAME)) {
//         console.error("Cannot generate " + configuration_1.CONFIG_FILENAME + ": file already exists");
//         process.exit(1);
//     }
//     var tslintJSON = JSON.stringify(configuration_1.DEFAULT_CONFIG, undefined, "    ");
//     fs.writeFileSync(configuration_1.CONFIG_FILENAME, tslintJSON);
//     process.exit(0);
// }
if (argv.test != null) {
    var results = test_1.runTest(argv.test, argv.r);
    var didAllTestsPass = test_1.consoleTestResultHandler(results);
    process.exit(didAllTestsPass ? 0 : 1);
}
if ("help" in argv) {
    outputStream.write(processed.help());
    var outputString = "\ntslint accepts the following commandline options:\n\n    -c, --config:\n        The location of the configuration file that tslint will use to\n        determine which rules are activated and what options to provide\n        to the rules. If no option is specified, the config file named\n        tslint.json is used, so long as it exists in the path.\n        The format of the file is { rules: { /* rules list */ } },\n        where /* rules list */ is a key: value comma-seperated list of\n        rulename: rule-options pairs. Rule-options can be either a\n        boolean true/false value denoting whether the rule is used or not,\n        or a list [boolean, ...] where the boolean provides the same role\n        as in the non-list case, and the rest of the list are options passed\n        to the rule that will determine what it checks for (such as number\n        of characters for the max-line-length rule, or what functions to ban\n        for the ban rule).\n\n    -e, --exclude:\n        A filename or glob which indicates files to exclude from linting.\n        This option can be supplied multiple times if you need multiple\n        globs to indicate which files to exclude.\n\n    --force:\n        Return status code 0 even if there are any lint errors.\n        Useful while running as npm script.\n\n    -i, --init:\n        Generates a tslint.json config file in the current working directory.\n\n    -o, --out:\n        A filename to output the results to. By default, tslint outputs to\n        stdout, which is usually the console where you're running it from.\n\n    -r, --rules-dir:\n        An additional rules directory, for user-created rules.\n        tslint will always check its default rules directory, in\n        node_modules/tslint/lib/rules, before checking the user-provided\n        rules directory, so rules in the user-provided rules directory\n        with the same name as the base rules will not be loaded.\n\n    -s, --formatters-dir:\n        An additional formatters directory, for user-created formatters.\n        Formatters are files that will format the tslint output, before\n        writing it to stdout or the file passed in --out. The default\n        directory, node_modules/tslint/build/formatters, will always be\n        checked first, so user-created formatters with the same names\n        as the base formatters will not be loaded.\n\n    -t, --format:\n        The formatter to use to format the results of the linter before\n        outputting it to stdout or the file passed in --out. The core\n        formatters are prose (human readable), json (machine readable)\n        and verbose. prose is the default if this option is not used.\n        Other built-in options include pmd, msbuild, checkstyle, and vso.\n        Additonal formatters can be added and used if the --formatters-dir\n        option is set.\n\n    --test:\n        Runs tslint on the specified directory and checks if tslint's output matches\n        the expected output in .lint files. Automatically loads the tslint.json file in the\n        specified directory as the configuration file for the tests. See the\n        full tslint documentation for more details on how this can be used to test custom rules.\n\n    --project:\n        The location of a tsconfig.json file that will be used to determine which\n        files will be linted.\n\n    --type-check\n        Enables the type checker when running linting rules. --project must be\n        specified in order to enable type checking.\n\n    -v, --version:\n        The current version of tslint.\n\n    -h, --help:\n        Prints this help message.\n";
    outputStream.write(outputString);
    process.exit(0);
}
if (argv.c && !fs.existsSync(argv.c)) {
    console.error("Invalid option for configuration: " + argv.c);
    process.exit(1);
}

// var comments = /\/\*[\s\S]*?\*\/|\/\/~.+|\/\/[^~].*\r?\n?/g

var root = argv._[0];
var dict = {};
var walkSync = function (dir, filelist) {

    if (dir[dir.length - 1] != '/') dir = dir.concat('/')
    console.log(dir);
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        var filepath = dir + file;
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
        } else {
            var base = filepath.substr(root.length + 1).split('/').join('.')
                , parts = base.split('.')
                , ext = parts.pop()
                ;
            base = parts.join('.');
            if (!dict[base]){ 
                dict[base] = 1;
                var obj = {base: base}
                if (ext == 'html' ) {
                    obj.path = filepath;
                }
                else{
                    var fp1 = filepath.slice(0, -ext.length) + 'html';  
                    obj.path = fs.existsSync(fp1)? fp1: filepath;
                }
                filelist.push(obj);
            }
            

             
        }
    });
    return filelist;
};
console.log('??')
function build() {
    var filelist = walkSync(root),
        index = path.resolve(argv.i),
        dist = path.resolve(argv.d),
        tmpls = [];

    outputStream.write("start combining templates. "+filelist.length+"\n");
    
    for (let i in filelist) {
        let filepath = filelist[i].path,
            base = filelist[i].base
            ;
        if(!base) continue;
        if(base[base.length-1] == '.') continue;
        let src = fs.readFileSync(filepath).toString(),
            // lines = src.split('\n').map(line => line.trim()),
            // content = lines.join(' '),
            content = src,
            ext = path.extname(filepath),
            // base = path.basename(filepath, '.html'),
            s;
        outputStream.write("\t" + filepath + "\n");


        if (argv.f) {
            if(ext == '.html'){
                var jsFile = filepath.slice(0, -ext.length) + '.js';
                if(fs.existsSync(jsFile)){
                    var js = fs.readFileSync(jsFile).toString();
                    var linter = new Linter();
                    var messages = linter.verifyAndFix(js, {
                        rules: {
                            semi: 2
                        }
                    });     
                    js = messages.output.replace(/{{/g, '{ {').replace(/}}/g, '} }');           
                    // js = messages.output.replace(comments, '').split('\n').map(line => line.trim()).join(' ');           
                    // js = js.replace(comments, '').split('\n').map(line => line.trim()).join(' ');
                    var sects = js.split('//~');
                    if(sects.length == 1)
                        sects.push('');
                    content = ' {{ '+sects.join(' \n}} \n'+content+'\n {{ ') +' }} ';
                    // console.log('**********', content);
                }
            }
            else{
                // content = content.replace(comments, '');
                content = src;
                
            }
            // tt.templateSettings.uglify = true;
            // console.log('-->', src)
            // return;
            var fn = tt.compile(content) + '';
            // console.log('-->', fn);
  
            var code = fn//.split('\n').map(line => line.trim()).join('')
                , opt = {
                    parse: {
                        // bare_returns: true,
                        html5_comments: false
                    }
                    , output: {
                        'inline_script': false
                    }
                }
                ;
            if (argv.u) {
            }
            else{
                opt.compress = false;
                opt.mangle  = false;
            }
            var u = UglifyJS.minify(code, opt);
            if (u.error) {
                console.log('\t', filepath, 'err, ------------->', u.error)
                // console.log(filepath, u.error);
                throw u.error;
            }
            code = u.code;

            console.log('\t  ', code);
            s = 'T["' + base + '"]= ' + code + ';'
        } else {
            s = '<script type="text/html" id="tmpl-' + base + '">' + content + '</script>';
        }
        tmpls.push(s);
    }

    var indexFile = fs.readFileSync(index).toString(),
        tmp = tmpls.join(' '),
        min = minify(indexFile, {
            removeComments: true,
            collapseWhitespace: true
        })

    ;
    if (argv.f) {

        tmp = '<script>window.T={};' + tmp + '</script>';
    }
    outputStream.write("writing new file\n");
    var mark = '</head><body',
        sections = min.split(mark);
    fs.writeFileSync(dist, sections[0] + tmp + mark + sections[1]);
    outputStream.write("Done\n");
}

build();
