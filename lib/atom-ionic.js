'use babel';

import AtomIonicView from './atom-ionic-view';
import { CompositeDisposable, BufferedProcess, Page } from 'atom';

export default {

  atomIonicView: null,
  subscriptions: null,
  log: null,
  panel: null,

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
      'atom-ionic:toggle-log' : () => this.toggleLog()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.atomIonicView.destroy();
  },

  serialize() {
    return {
      atomIonicViewState: this.atomIonicView.serialize()
    };
  },

  deploy() {
    this.deviceConnected(
      this._deploy.bind(this),
      function() {
        atom.notifications.addError("No device connected", {dismissable: true});
      }
    );
  },

  _deploy() {
    this.log.innerHTML = "";
    this.panel.show();
    var process = new BufferedProcess({
      command: 'ionic',
      args: ['cordova', 'run', 'android', '--no-interactive', '--device'],
      options: { cwd: atom.project.getPaths()[0], stdio: [] },
      stdout: function(output) {
        this.log.innerHTML += this.removeColors(output);
        this.log.scrollTop = this.log.scrollHeight;
      }.bind(this),
      exit: function(code) {
        if (code == 0) {
          atom.notifications.addInfo("deploy suceeded", {dismissable: true});
        } else {
          atom.notifications.addError("deploy failed", {dismissable: true});
        }
      }.bind(this),
      stderr: function(output) {
        atom.notifications.addWarning("Deploy has some troubles", {dismissable: true, detail: this.removeColors(output)});
      }.bind(this)
    });
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
            deviceFoundCallback();
            return;
          }
        }
        noDeviceCallback();
      }.bind(this),
      exit: function(code) {
        if (code != 0) {
          noDeviceCallback();
        }
      }.bind(this)
    });
  }

};
