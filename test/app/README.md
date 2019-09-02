# app-credentials test/app

## Usage

### Run the example

```shell
export DEBUG=devebot*,app*
export LOGOLITE_DEBUGLOG_ENABLED=true
node test/app
```

### Generate password

```
node --eval "console.log(require('bcryptjs').hashSync('changeme', 10))"
```
