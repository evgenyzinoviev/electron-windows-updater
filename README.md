# electron-windows-updater

This module implements `auto-updater` logic for OS X on Windows.

This is how you can use it:

```
const autoUpdater = require(process.platform == 'win32' ? 'electron-windows-updater' : 'auto-updater')
```

Everything (should) work like on OS X: http://electron.atom.io/docs/v0.34.0/api/auto-updater/

It is very alpha, it was written in a couple of hours and it doesn't implement cool security™ features like signature checking and so on (yet) and was only tested on Windows 8.1.
