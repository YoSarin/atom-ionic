'use babel';

import AtomIonicView from './atom-ionic-view';
import { CompositeDisposable, BufferedProcess, Page } from 'atom';

export default {

  atomIonicView: null,
  subscriptions: null,
  log: null,
  panel: null,
  serveProcess: null,

  activate(state) {
    this.atomIonicView = new AtomIonicView(state.atomIonicViewState);

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    this.log = document.createElement('div');
    this.log.className = "atom-ionic-log";

    this.panel = atom.workspace.addRightPanel({item: this.log});

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-ionic:deploy': () => this.deploy(),
      'atom-ionic:devices': () => this.devices(),
      'atom-ionic:toggle-log' : () => this.toggleLog(),
      'atom-ionic:serve' : () => this.serve(),
      'atom-ionic:stop-serve' : () => this.stopServe(),
      'atom-ionic:add-page' : () => this.addPage(),
      'atom-ionic:add-plugin' : () => this.addPlugin()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.atomIonicView.destroy();
    this.stopServe();
  },

  serialize() {
    return {
      atomIonicViewState: this.atomIonicView.serialize()
    };
  },

  devices() {
    var callback = function(output) {
      atom.notifications.addSuccess("Connected devices", {dismissable: true, detail: this.removeColors(output)})
    }.bind(this);
    this.deviceConnected(callback, callback);
  },

  serve() {
    if (this.serveProcess != null) {
      atom.notifications.addInfo("Ionic serve already running");
      return;
    }
    this.log.innerHTML = "";
    this.panel.show();
    this.serveProcess = new BufferedProcess({
      command: 'ionic',
      args: ['serve', '--no-open', '--no-interactive'],
      options: { cwd: atom.project.getPaths()[0], stdio: [] },
      stdout: function(output) {
        this.log.innerHTML += this.removeColors(output);
        this.log.scrollTop = this.log.scrollHeight;
      }.bind(this),
      exit: function(code) {
        if (code != 0) {
          atom.notifications.addError("Ionic server failed", {dismissable: true});
        }
        this.serveProcess = null;
      }.bind(this),
      stderr: function(output) {
        atom.notifications.addWarning("Ionic serve has some troubles", {dismissable: true, detail: this.removeColors(output)});
      }.bind(this)
    });
  },

  stopServe() {
    if (this.serveProcess == null) {
      atom.notifications.addInfo("Ionic serve not running");
      return;
    }
    this.serveProcess.kill();
    this.serveProcess = null;
    atom.notifications.addSuccess("Ionic serve killed");
  },

  deploy() {
    this.deviceConnected(
      function () {
        this._isIonic().then(function (isIonic) {
          this._deploy.bind(this)(isIonic);
        }.bind(this));
      }.bind(this),
      function() {
        atom.notifications.addError("No device connected", {dismissable: true});
      }
    );
  },

  _deploy(isIonic) {
    this.log.innerHTML = "";
    this.panel.show();
    var command = 'ionic';
    var args = ['cordova', 'run', 'android', '--no-interactive', '--device'];
    if (!isIonic) {
      command = args.shift();
    }
    var process = new BufferedProcess({
      command: command,
      args: args,
      options: { cwd: atom.project.getPaths()[0], stdio: [] },
      stdout: function(output) {
        this.log.innerHTML += this.removeColors(output);
        this.log.scrollTop = this.log.scrollHeight;
      }.bind(this),
      exit: function(code) {
        if (code == 0) {
          atom.notifications.addSuccess("deploy suceeded", {dismissable: true});
        } else {
          atom.notifications.addError("deploy failed", {dismissable: true});
        }
      }.bind(this),
      stderr: function(output) {
        atom.notifications.addWarning("Deploy has some troubles", {dismissable: true, detail: this.removeColors(output)});
      }.bind(this)
    });
  },

  _isIonic() {
    filePath = atom.workspace.getActivePaneItem().buffer.file.path;
    let root = null;
    atom.project.getDirectories().forEach(function(dir){
    	if (dir.contains(filePath)) {
    		root = dir;
        return false;
    	}
    });
    console.log(root);
    console.log(root.getFile("ionic.config.json").exists());
    return root.getFile("ionic.config.json").exists();
  },

  toggleLog() {
    this.panel.isVisible() ? this.panel.hide() : this.panel.show();
  },

  removeColors(input) {
    return input.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  },

  deviceConnected(deviceFoundCallback, noDeviceCallback) {
    var process = new BufferedProcess({
      command: 'adb',
      args: ['devices'],
      stdout: function (output) {
        var lines = output.trim().split("\n");
        for (var idx in lines) {
          var line = lines[idx].trim();
          if (line != "" && line != "List of devices attached") {
            deviceFoundCallback(output);
            return;
          }
        }
        noDeviceCallback(output);
      }.bind(this),
      exit: function(code) {
        if (code != 0) {
          noDeviceCallback(code);
        }
      }.bind(this)
    });
  },

  addPage() {

  },

  addPlugin() {

  }

};
