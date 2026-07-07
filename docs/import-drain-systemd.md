# Import drain systemd worker

The import drain worker processes queued import jobs through the built CLI:

```bash
bun /home/vince/websites/mylists/current/dist/cli/index.js import-drain
```

The app can start this worker after an import is queued with:

```env
IMPORT_DRAIN_AUTO_START=true
IMPORT_DRAIN_SYSTEMD_USER=true
IMPORT_DRAIN_SYSTEMD_SERVICE=mylists-import-drain.service
```

For a user service, install the example unit:

```bash
mkdir -p ~/.config/systemd/user
cp docs/systemd/mylists-import-drain.service.example ~/.config/systemd/user/mylists-import-drain.service
systemctl --user daemon-reload
```

Then test it manually:

```bash
systemctl --user start mylists-import-drain.service
journalctl --user -u mylists-import-drain.service -f
```

Adjust `WorkingDirectory`, `EnvironmentFile`, and `ExecStart` if your production path is different.
