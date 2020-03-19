"use strict";

// [START app]
const express = require("express");
const bodyParser = require("body-parser");
const BoxSDK = require("box-node-sdk");
var path = require("path");
const jsonConfig = require(path.resolve(__dirname, "./cli-jam.json"));

var fs = require("fs");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Box config
var sdk = BoxSDK.getPreconfiguredInstance(jsonConfig);
var serviceAccountClient = sdk.getAppAuthClient("enterprise");
var boxAccessToken;

// Pras EID - 59194496
var saToken = sdk.getEnterpriseAppAuthTokens("287644287", null, function(
  error,
  token
) {
  console.log("Box access token ", token.accessToken);
  boxAccessToken = token.accessToken;
});
// End Box config

// Okta configuration

const session = require("express-session");
const { ExpressOIDC } = require("@okta/oidc-middleware");

// session support is required to use ExpressOIDC
app.use(
  session({
    secret: "this should be secure",
    resave: true,
    saveUninitialized: false
  })
);

const oidc = new ExpressOIDC({
  //issuer: "https://dev-348986.okta.com/oauth2/default",
  issuer: "https://dev-348986.okta.com/oauth2/aus403kadJ3g9dwDs4x6",
  client_id: "0oa3y0d5iEqYDoOsC4x6",
  client_secret: "CZxgyEHU8OSK4xWmbqkMuLj76Tj3ffizhzeXFimn",
  appBaseUrl: "http://localhost:3000",
  loginRedirectUri: "http://localhost:3000/login",
  scope: "openid profile"
});

// ExpressOIDC attaches handlers for the /login and /authorization-code/callback routes
app.use(oidc.router);

//app.all('*', oidc.ensureAuthenticated());

// Okta configuration end

// JWT config

const OktaJwtVerifier = require("@okta/jwt-verifier");

const njwt = require("njwt");
const secureRandom = require("secure-random");
var signingKey = secureRandom(256, { type: "Buffer" });

const clientSecret = "CZxgyEHU8OSK4xWmbqkMuLj76Tj3ffizhzeXFimn"; // Or load from configuration
const clientId = "0oa3y0d5iEqYDoOsC4x6"; // Or load from configuration

var publicDir = require('path').join(__dirname,'/public');
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.render("main.ejs");
});

app.get("/login", oidc.ensureAuthenticated(), (req, res) => {
  console.log("Successful callback from Okta");
  console.log("User Info --> ", req.userContext, "\n");
  console.log("Access Token --> ", req.userContext.tokens.access_token, "\n");
  console.log("ID Token --> ", req.userContext.tokens.id_token, "\n");
  res.render("landing.ejs", {
    boxAccessToken: boxAccessToken,
    name: req.userContext.userinfo.name,
    username: req.userContext.userinfo.preferred_username,
    id_token: req.userContext.tokens.id_token
  });
});

app.get("/logout", oidc.ensureAuthenticated(), (req, res) => {
  res.render("logout.ejs");
});

app.get("/api1", authenticationRequired1, (req, res) => {
  res.json({
    messages: [
      {
        grossProfit: "32,345"
      }
    ]
  });
});

app.post("/api", authenticationRequired, (req, res) => {});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});
// [END app]ß

function authenticationRequired(req, res, next) {
  //  console.log("Request Body ",req.body);
  var taxId = req.body.taxId;

  var oktaJwtVerifier = new OktaJwtVerifier({
    issuer: "https://dev-348986.okta.com/oauth2/aus403kadJ3g9dwDs4x6",
    assertClaims: {
      taxID: taxId
    } // required
  });

  var accessToken = req.body.id_token;

  return oktaJwtVerifier
    .verifyAccessToken(accessToken, clientId)
    .then(jwt => {
      req.jwt = jwt;
      //next();
      res.status(200).send("32,345");
    })
    .catch(err => {
      res.status(200).send(err.message);
    });
}

function authenticationRequired1(req, res, next) {
  //  console.log("Request Body ",req.body);
  var taxId = req.body.taxId;

  var oktaJwtVerifier = new OktaJwtVerifier({
    issuer: "https://dev-348986.okta.com/oauth2/aus403kadJ3g9dwDs4x6",
    assertClaims: {
      taxID: taxId
    } // required
  });

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/Bearer (.+)/);

  if (!match) {
    res.status(401);
    return next("Unauthorized");
  }

  const accessToken = match[1];

  return oktaJwtVerifier
    .verifyAccessToken(accessToken, clientId)
    .then(jwt => {
      req.jwt = jwt;
      next();
    })
    .catch(err => {
      res.status(200).send(err.message);
    });
}
