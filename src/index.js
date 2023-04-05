#!/usr/bin/env node
const path = require('path');
const chokidar = require('chokidar');
const { exec } = require('child_process');
const portfinder = require('portfinder');
const terminate = require('terminate');
const versionCheck = require('@version-checker/core');
const pkg = require('../package.json');

const PORT = 8080;
const currentDir = process.cwd();
var running = false;
var tomcatExec;

console.clear();
console.log(`Ready: Watching the following directory for changes "${path.join(currentDir)}"`);

const options = {
    repo: 'TCWatch',
    owner: 'WickednessPro',
    currentVersion: pkg.version
};

versionCheck(options, function (error, update) {
    if (error) throw error;
    if (update.update !== undefined) {
        console.log(`An Update is available! Your version: ${pkg.version}, latest: ${update.update.name}, url: ${update.update.url}`)
    }
})

if (process.env.CLASSPATH === null || process.env.CLASSPATH === '' || process.env.CLASSPATH.includes(';') === false) {
    console.error('Please check the CLASSPATH env variable and try again.');
    process.exit();
}

if (process.env.JAVA_HOME === null || process.env.JRE_HOME === '') {
    console.error('Please check the CLASSPATH env variable and try again.');
    process.exit();
}

// Start Tomcat
const binfolder = path.join(currentDir + '../../../bin');
checkTomcat().then((data) => {
    if (data === true) {
        console.error(`A process is already running using port 8080.`);
    } else if (data === false) {
        var proc = exec(`cd ${binfolder} && catalina run`);
        running = true;
        tomcatExec = proc;
    }
})

var watcher = chokidar.watch(path.join(currentDir), {ignored: /^\./, persistent: true, ignoreInitial: true});

watcher.on('change', async function (item) {
    if (path.extname(item) === '.xml') {
        console.log('\x1b[36m%s\x1b[0m', 'Reloading');
        await runTomcat(path.join(currentDir + '/WEB-INF/classes'));
        console.log(`Ready: Watching the following directory for changes "${path.join(currentDir)}"`);
    }
    if (path.extname(item) === '.java') {
        exec(`cd ${path.join('WEB-INF/classes')} && javac *.java`, async (err, out, stderr) => {
            if (err) {
                console.error(`An error has occurred: ${err.message}`);
                process.exit();
            }
            if (stderr) {
                console.error(`An error has occurred: ${stderr}`);
                process.exit();
            }

            if (!err || !stderr) {
                console.log('\x1b[36m%s\x1b[0m', 'Reloading');
                await runTomcat(path.join(currentDir + '/WEB-INF/classes'));
                console.log(`Ready: Watching the following directory for changes "${path.join(currentDir)}"`);
            }
        });
    }
});

watcher.on('unlink', async function (item) {
    if (path.extname(item) === '.xml') {
        console.log('\x1b[36m%s\x1b[0m', 'Reloading');
        await runTomcat();
        console.log(`Ready: Watching the following directory for changes "${path.join(currentDir)}"`);
    }
    if (path.extname(item) === '.java') {
        exec(`cd ${path.join('WEB-INF/classes')} && javac *.java`, async (err, out, stderr) => {
            if (err) {
                console.error(`An error has occurred: ${err.message}`);
                process.exit();
            }
            if (stderr) {
                console.error(`An error has occurred: ${stderr}`);
                process.exit();
            }

            if (!err || !stderr) {
                console.log('\x1b[36m%s\x1b[0m', 'Reloading');
                await runTomcat();
                console.log(`Ready: Watching the following directory for changes "${path.join(currentDir)}"`);
            }
        });
    }
});

watcher.on('error', function (err) {
    console.error(`The following error has occurred: ${err}`);
    process.exit();
});

async function runTomcat() {
    if (running === true) {
        terminate(tomcatExec.pid);
        var proc = exec(`cd ${binfolder} && catalina run`);
        running = true;
        tomcatExec = proc;
    }
}

async function checkTomcat() {
    // Checks if tomcat port is alread occupied.
    var alreadyRunning;
    portfinder.setBasePort(8080);
    const port = await new Promise((resolve, reject) => {
      portfinder.getPort((err, port) => {
        if (err) {
          reject(err);
        } else {
          resolve(port);
        }
      });
    });

    if (port.toString() === PORT.toString()) {
      alreadyRunning = false;
    } else {
      alreadyRunning = true;
    }
    return alreadyRunning;
}