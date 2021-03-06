/**
 * The core middleware to retrieve FrameNet patterns from the database.
 * This is where the core Valencer algorithm lies.
 * All other FrameNet middlewares are wrappers around core to pass parameters
 * and process the output
 */
const bluebird = require('bluebird');
const ApiError = require('./../../exceptions/apiException');
const config = require('./../../config');
const utils = require('./../../utils/utils');

const Promise = bluebird.Promise;
const logger = config.logger;

/**
 * Retrieve an array of valenceUnit objects from the db matching any combination of
 * FE.PT.GF, in any order, and with potentially unspecified elements:
 * FE.PT.GF / PT.FE.GF / PT.GF / GF.FE / FE / GF etc.
 * @param unit: an array of [FEids]/PT/GF tags: [[fe_id1,...,fe_idn], 'PT', 'GF'] corresponding to a
 * single valenceUnit inside a tokenArray pattern (@see formatter)
 *
 */
function getVUIDsWithValenceUnitModel(ValenceUnit) {
  return async function getValenceUnitsIDs(valenceUnitAsArrayWithFEids) {
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
    return ValenceUnit.distinct('_id', expVU);
  };
}

function getArrayOfArrayOfVUidsWithValenceUnitModel(ValenceUnit) {
  return async function getArrayOfArrayOfValenceUnitsIDs(formattedValencePatternArrayWithFEids) {
    return Promise.all(formattedValencePatternArrayWithFEids
      .map(vuAsArrayWithFEids => getVUIDsWithValenceUnitModel(ValenceUnit)(vuAsArrayWithFEids)));
  };
}


/**
 * Returns an array of array of valenceUnit objects.
 */
async function retrieveValenceUnitsIDs(context, next) {
  const startTime = utils.getStartTime();
  const vuModel = context.valencer.models.ValenceUnit;
  const vpWithFEids = context.valencer.query.vp.withFEids;
  const valenceUnitsIDs = await getArrayOfArrayOfVUidsWithValenceUnitModel(vuModel)(vpWithFEids);
  context.valencer.results.tmp.valenceUnitsIDs = valenceUnitsIDs || [];
  logger.debug(`context.valencer.results.tmp.valenceUnitsIDs.length = ${context.valencer.results.tmp.valenceUnitsIDs.length}`);
  logger.verbose(`context.valencer.results.tmp.valenceUnitsIDs retrieved from database in ${utils.getElapsedTime(startTime)}ms`);
  return next();
}

// Query has passed validation so all FrameElements should be specified
// See validator.validateQueryParametersCombination
function getFrameElementNamesSet(formattedVPquery, vpQueryWithFEids) {
  const mySet = new Set();
  for (const vindex in vpQueryWithFEids) {
    if ({}.hasOwnProperty.call(vpQueryWithFEids, vindex)) {
      const valence = vpQueryWithFEids[vindex];
      for (const tindex in valence) {
        if (Array.isArray(valence[tindex])) {
          mySet.add(formattedVPquery[vindex][tindex]);
        }
      }
    }
  }
  return mySet;
}

function getExcludedFEidsWithFEmodel(FrameElement) {
  return async function getExcludedFEids(feNamesSet) {
    return FrameElement.collection.distinct('_id', {
      coreType: 'Core',
      name: { $nin: [...feNamesSet] },
    });
  };
}

function getExcludedVUidsWithVUmodel(ValenceUnit) {
  return async function getExcludedVUids(excludedFEids) {
    return ValenceUnit.collection.distinct('_id', {
      FE: { $in: excludedFEids },
    });
  };
}

async function retrieveExcludedVUIDs(context, next) {
  // Do this only if withExtraCoreFEs is set to false
  const startTime = utils.getStartTime();
  if (!context.query.withExtraCoreFEs) {
    const feNamesSet = await getFrameElementNamesSet(context.valencer.query.vp.formatted,
                                                     context.valencer.query.vp.withFEids);
    context.valencer.query.feNamesSet = feNamesSet;
    logger.verbose(`context.valencer.results.tmp.feNamesSet retrieved from database in ${utils.getElapsedTime(startTime)}ms`);
    const startTime2 = utils.getStartTime();
    const feModel = context.valencer.models.FrameElement;
    const excludedFEids = await getExcludedFEidsWithFEmodel(feModel)(feNamesSet);
    context.valencer.results.tmp.excludedFEids = excludedFEids;
    logger.debug(`context.valencer.results.tmp.excludedFEids.length = ${context.valencer.results.tmp.excludedFEids.length}`);
    logger.verbose(`context.valencer.results.tmp.excludedFEids retrieved from database in ${utils.getElapsedTime(startTime2)}ms`);
    const startTime3 = utils.getStartTime();
    const vuModel = context.valencer.models.ValenceUnit;
    const exVUids = await getExcludedVUidsWithVUmodel(vuModel)(excludedFEids);
    context.valencer.results.tmp.excludedVUids = exVUids;
    logger.verbose(`context.valencer.results.tmp.excludedVUids retrieved from database in ${utils.getElapsedTime(startTime3)}ms`);
  }
  logger.debug(`context.valencer.results.tmp.excludedVUids.length = ${context.valencer.results.tmp.excludedVUids.length}`);
  logger.verbose(`context.valencer.results.tmp.excludedVUids retrieved from database in ${utils.getElapsedTime(startTime)}ms`);
  return next();
}

module.exports = {
  retrieveValenceUnitsIDs,
  retrieveExcludedVUIDs,
};
