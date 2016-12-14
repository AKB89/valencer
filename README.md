# Valencer
[![GitHub release][release-image]][release-url]
[![Build][travis-image]][travis-url]
[![Dependencies][david-image]][david-url]
[![MIT License][license-image]][license-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Code Quality][quality-image]][quality-url]
[![FrameNet][framenet-image]][framenet-url]

Welcome to **Valencer**, a RESTful API to query combinations of syntactic realizations of the arguments of a predicate &ndash; aka *valence patterns* &ndash; in the FrameNet database.

## Requirements
- [Mongo](https://docs.mongodb.com/manual/administration/install-community/)
- [Node](https://nodejs.org/en/download/)

To import FrameNet data to a Mongo database, check out [NoFrameNet](https://github.com/akb89/noframenet)

## HowTo
To start the **Valencer** server:

### 1. Install the required dependencies
Run the following command in your terminal, under the Valencer directory:
```
npm install
```

### 2. Set-up the configuration
Modify the `config/production.js` file
```
const config = {
  dbUri: 'mongodb://localhost:27017/noframenet16',
  port: 3030,
  logger: logger.info,
};
```
The `dbUri` parameter should refer to the your Mongo database containing FrameNet data.

### 3. Start the server
Run the following command in your terminal, under the Valencer directory:
```
npm run start
```

## Shoot your first query
Here is a sample HTTP request querying for all the AnnotationSets referring to the valence pattern `Donor.NP.Ext Theme.NP.Obj Recipient.PP[to].Dep`:
```
http://localhost:3030/annoSets?vp=Donor.NP.Ext+Theme.NP.Obj+Recipient.PP[to].Dep
```

[release-image]:https://img.shields.io/github/release/akb89/valencer.svg?style=flat-square
[release-url]:https://img.shields.io/github/release/akb89/valencer/v1
[travis-image]:https://img.shields.io/travis/akb89/valencer.svg?style=flat-square
[travis-url]:https://travis-ci.org/akb89/valencer
[coverage-image]:https://img.shields.io/coveralls/akb89/valencer/dev.svg?style=flat-square
[coverage-url]:https://coveralls.io/r/akb89/valencer?branch=master
[quality-image]:https://img.shields.io/codeclimate/github/akb89/valencer.svg?style=flat-square
[quality-url]:https://codeclimate.com/github/akb89/valencer
[framenet-image]:https://img.shields.io/badge/FrameNet-%3E%3D1.5-blue.svg?style=flat-square
[framenet-url]:https://framenet.icsi.berkeley.edu/fndrupal
[license-image]:http://img.shields.io/badge/license-MIT-000000.svg?style=flat-square
[license-url]:LICENSE.txt
[david-image]: https://david-dm.org/akb89/valencer.svg?style=flat-square
[david-url]: https://david-dm.org/akb89/valencer
