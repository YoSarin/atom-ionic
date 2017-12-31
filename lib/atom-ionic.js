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
      'atom-ionic:deploy': () => this.deploy()
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
    this.panel.show();
    var process = new BufferedProcess({
      command: 'ionic',
      args: ['cordova', 'run', 'android', '--no-interactive'],
      options: { cwd: atom.project.getPaths()[0], stdio: [] },
      stdout: function(output) {
        this.log.innerHTML += this.removeColors(output);
        this.log.scrollTop = this.log.scrollHeight;
      }.bind(this),
      exit: function(code) {
        if (code == 0) {
          this.panel.hide();
          this.log.innerHTML = "";
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

  removeColors(input) {
    return input.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  },

  listDevices() {
    exec('adb devices', function (error, stdout, stderr) {
      if (error != null) {
        atom.notifications.addError("adb call failed", {detail: stderr, dismissable: true});
        return;
      }
      atom.notifications.addInfo("adb call succeeded", {detail: stdout});
      console.log(error, stdout, stderr);
    }.bind(this));
  }

};
