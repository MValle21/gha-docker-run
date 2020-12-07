const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const os = require('os');


async function run() {
    try {
        const image = core.getInput('image');
        const commands = core.getInput('run');
        const user = core.getInput('user');
        const registry = core.getInput('registry');
        const username = core.getInput('username');
        const password = core.getInput('password');
        
        if (!!password.trim()) {
            core.setSecret(password)
        }
    
        core.startGroup('docker login');
        var login_cmd;
        if (!!username.trim() && !!password.trim()) {
            if (!!registry.trim()) {
                login_cmd=(`docker login ${registry} -u ${username} -p ${password}`);
            } else {
                login_cmd=(`docker login ${registry} -u ${username} -p ${password}`);
            }
            await exec.exec(login_cmd)
        } else {
            console.log('Username and password not provided. Skipping "docker login" step.')
        }
        core.endGroup()

        core.startGroup('docker run');
        var run_cmd;
        run_cmd=`docker run --rm ${setDockerEnvVars()} --workdir /github/workspace -v ${process.cwd()}:/github/workspace -v /var/run/docker.sock:/var/run/docker.sock`;
        if (!!user.trim()) { 
            run_cmd=`${run_cmd} --user ${user}`
        }
        if (!!commands) {
            run_cmd=`${run_cmd} --entrypoint /bin/bash`
        }
        if (!!image.trim()) {
            run_cmd=`${run_cmd} ${image}`;
        }
        if (!!commands.trim()) {
            fs = require('fs');
            fs.writeFile('docker_commands.sh', commands, function (err) {
                if (err) return console.log(err);
            });
            run_cmd=`${run_cmd} ./docker_commands.sh`
        }
        await exec.exec(run_cmd)
        await exec.exec('rm -rf docker_commands.sh')
        core.endGroup()

        core.startGroup('fixing permissions');
        // START -> Support for original runner permissions
        if (os.userInfo().username == "actions") {
          await exec.exec("sudo chown -R actions:actions .");
        }
        // END -> Support for original runner permissions
        // START -> 12/7/2020: Support for recent changes to runner user:group permissions
        if (os.userInfo().username == "runner") {
          await exec.exec("sudo chown -R runner:docker .");
        }
        // END -> 12/7/2020: Support for recent changes to runner user:group permissions
        core.endGroup
        
    } catch (error) {
        core.setFailed(error.message);
    }
}

function setDockerEnvVars() {
    var env_vars = [];
    for (let i in process.env) { 
        if (!!process.env[i].trim()) {
            env_vars.push(`-e \"${i}=${process.env[i].replace(/\n/g,'\\n')}\"`)
        }
    }
    return env_vars.join(' ')
}
    
run();
