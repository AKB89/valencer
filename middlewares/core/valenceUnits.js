/**
 * The core middleware to retrieve FrameNet patterns from the database.
 * This is where the core Valencer algorithm lies.
 * All other FrameNet middlewares are wrappers around core to pass parameters
 * and process the output
 */
const bluebird = require('bluebird');
const FrameElement = require('noframenet-core').FrameElement;
const ValenceUnit = require('noframenet-core').ValenceUnit;
const ApiError = require('./../../exceptions/apiException');
const config = require('./../../config');
const utils = require('./../../utils/utils');

const Promise = bluebird.Promise;
const logger = config.logger;

/**
 * Retrieve an array of valenceUnit objects from the db matching any combination of
 * FE.PT.GF, in any order, and with potentially unspecified elements:
 * FE.PT.GF / PT.FE.GF / PT.GF / GF.FE / FE / GF etc.
 * @param unit: an array of FE/PT/GF tags: ['FE', 'PT', 'GF'] corresponding to a
 * single valenceUnit inside a tokenArray pattern (@see formatter)
 */
async function getValenceUnitsIDs(valenceUnitAsArrayWithFEids) {
  const valenceUnit = { FE: undefined, PT: undefined, GF: undefined };
  for (const token of valenceUnitAsArrayWithFEids) {
    let found = false;
    for (const key in valenceUnit) {
      if (valenceUnit[key] === undefined) {
        try {
          const dbKey = await ValenceUnit.findOne({ [key]: { $in: token } });
          if (dbKey !== null) {
            valenceUnit[key] = token;
            found = true;
            break;
          }
        } catch (err) {
          logger.silly('Invalid combination of units');
        }
      }
    }
    if (!found) {
      throw new ApiError.NotFoundError(`Could not find token in FrameNet database: ${token}`);
    }
  }
  const expVU = {};
  if (valenceUnit.FE !== undefined) {
    expVU.FE = valenceUnit.FE;
  }
  if (valenceUnit.PT !== undefined) {
    expVU.PT = valenceUnit.PT;
  }
  if (valenceUnit.GF !== undefined) {
    expVU.GF = valenceUnit.GF;
  }
  return (await ValenceUnit.find(expVU)).map(vu => vu._id);
}

async function getArrayOfArrayOfValenceUnitsIDs(formattedValencePatternArrayWithFEids) {
  return Promise.all(
    formattedValencePatternArrayWithFEids
      .map(valenceUnitAsArrayWithFEids => getValenceUnitsIDs(
        valenceUnitAsArrayWithFEids)));
}

/**
 * Returns an array of array of valenceUnit objects.
 */
async function retrieveValenceUnitsIDs(context, next) {
  const startTime = utils.getStartTime();
  const valenceUnitsIDs = await getArrayOfArrayOfValenceUnitsIDs(
    context.valencer.query.vp.withFEids);
  context.valencer.results.tmp.valenceUnitsIDs = valenceUnitsIDs || [];
  logger.debug(`context.valencer.results.tmp.valenceUnitsIDs.length = ${context.valencer.results.tmp.valenceUnitsIDs.length}`);
  logger.verbose(`context.valencer.results.tmp.valenceUnitsIDs retrieved from database in ${utils.getElapsedTime(startTime)}ms`);
  return next();
}

// Query has passed validation so all FrameElements should be specified
// See validator.validateQueryParametersCombination
async function getFrameElementNamesSet(queryVPwithFEids) {
  const mySet = new Set();
  for (const valence of queryVPwithFEids) {
    for (const token of valence) {
      if (Array.isArray(token)) {
        mySet.add((await FrameElement.findById(token[0])).name);
      }
    }
  }
  return mySet;
}

async function getExcludedFEids(feNamesSet) {
  return FrameElement.collection.find({
    coreType: 'Core',
    name: { $nin: [...feNamesSet] },
  }).map(fe => fe._id).toArray();
}

async function getExcludedVUids(excludedFEids) {
  return ValenceUnit.find({
    FE: { $in: excludedFEids },
  });
}


async function retrieveExcludedVUIDs(context, next) {
  // Do this only if withExtraCoreFEs is set to false
  if (!context.query.withExtraCoreFEs) {
    context.valencer.query.feNamesSet = await getFrameElementNamesSet(
      context.valencer.query.vp.withFEids);
    context.valencer.results.tmp.excludedFEids = await getExcludedFEids(
      context.valencer.query.feNamesSet);
    context.valencer.results.tmp.excludedVUids = await getExcludedVUids(
      context.valencer.results.tmp.excludedFEids);
  }
  return next();
}

module.exports = {
  retrieveValenceUnitsIDs,
  retrieveExcludedVUIDs,
};
