# app-credentials test/app

## Usage

### Generate password

```
node --eval "console.log(require('bcryptjs').hashSync('changeme', 10))"
```
