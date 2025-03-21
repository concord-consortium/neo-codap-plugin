# CODAP Plugin Starter Project

This is a bare-bones React project. It contains a simple React view with the libraries for using the [CODAP Plugin API](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API).

## Development

### Copying a starter project

1. Create a new public repository for your project (e.g. `new-repository`)
2. Create a clone of the starter repo
    ```
    git clone --single-branch https://github.com/concord-consortium/codap-plugin-starter-project.git new-repository
    ```
3. Update the starter repo

    First, update and run the starter project:
    ```
    cd new-repository
    npm install
    npm update
    npm start
    ```
    The browser should automatically open [localhost:8080](http://localhost:8080) (or 8081 if you are already using 8080). Checking for the words "CODAP Starter Plugin".

    It's ok if you see an error like `handleResponse: CODAP request timed out: [{"action":"update","resource":"interactiveFrame","values":{"name":"Sample Plugin","version":"0.0.1","dimensions":{"width":380,"height":680}}},{"action":"get","resource":"interactiveFrame"}]`. This just means that the plugin is running outside of Codap, so is not receiving responses to API requests, which is expected.
    
    Also verify that the test suite still passes:
    ```
    npm run test
    ```

4. Next, re-initialize the repo to create a new history
    ```
    rm -rf .git
    git init
    ```
5. Create an initial commit for your new project
    ```
    git add .
    git commit -m "Initial commit"
    ```
6. Push to your new repository
    ```
    git remote add origin https://github.com/concord-consortium/new-repository.git
    git push -u origin master
    ```
7. Open your new repository and update all instances of `codap-plugin-starter-project` to `new-repository`.
   Note: this will do some of the configuration for Travis deployment to S3, but you'll still need to follow
   the instructions [here](https://docs.google.com/document/d/e/2PACX-1vTpYjbGmUMxk_FswUmapK_RzVyEtm1WdnFcNByp9mqwHnp0nR_EzRUOiubuUCsGwzQgOnut_UiabYOM/pub).
8. Your new repository is ready! Remove this section of the `README`, and follow the steps below to use it.

### Initial steps

1. Clone this repo and `cd` into it
2. Run `npm install` to pull dependencies
3. Run `npm start` to run `webpack-dev-server` in development mode with hot module replacement

## Testing the plugin in CODAP

There are two ways to test the plugin in CODAP:
- running it locally on https and use the deployed CODAP
- running it and CODAP locally on http

### HTTPS
1. Start the plugin with `npm run start:secure`. You need to first setup a local http certificate if you haven't done so: https://github.com/concord-consortium/codap/blob/main/v3/README.md#run-using-https
2. Run CODAP v2 or v3 with the `di` parameter:
    - v2: https://codap.concord.org/app/?di=https://localhost:8080/
    - v3: https://codap3.concord.org/?di=https://localhost:8080/

### HTTP
1. Start plugin webserver `npm start` (it will be on 8080 by default)
2. Setup a local webserver running CODAP.
    - v2: Download the latest `build_[...].zip` file https://codap.concord.org/releases/zips/. Extract the zip to a folder and run it with a local webserver. For example `npx httpserver -p 8081`
    - v3: Checkout the v3 source, install the dependencies, and start the dev server: https://github.com/concord-consortium/codap/blob/main/v3/README.md#initial-steps. The dev server should automatically choose the next avaiable port which would normally be 8081
3. Open CODAP with the plugin embedded in it: http://localhost:8081/static/dg/en/cert/index.html?di=http://localhost:8080


For further information on [CODAP Data Interactive Plugin API](https://github.com/concord-consortium/codap/wiki/CODAP-Data-Interactive-Plugin-API).