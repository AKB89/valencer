/**
 * The core middleware to retrieve FrameNet patterns from the database.
 * This is where the core Valencer algorithm lies.
 * All other FrameNet middlewares are wrappers around core to pass parameters
 * and process the output
 */
const Pattern = require('noframenet-core').Pattern;
const config = require('./../../config');
const utils = require('./../../utils/utils');

const logger = config.logger;

async function getPatternsIDs(arrayOfArrayOfValenceUnitIDs, excludedVUids) {
  if (arrayOfArrayOfValenceUnitIDs.length === 1) {
    return Pattern.collection.find({
      $and: [{
        valenceUnits: { $in: arrayOfArrayOfValenceUnitIDs[0] },
      }, {
        valenceUnits: { $nin: excludedVUids },
      }],
    }).map(pattern => pattern._id).toArray();
  }
  let patternsIDs;
  for (let i = arrayOfArrayOfValenceUnitIDs.length; i > 1; i -= 1) {
    const combinations = utils.getKNCombinations(i, arrayOfArrayOfValenceUnitIDs.length);
    for (const combination of combinations) {
      const merge = new Set();
      for (let k = 0; k < combination.length; k += 1) {
        merge.addEach(arrayOfArrayOfValenceUnitIDs[combination[k]]);
        if (!patternsIDs) {
          patternsIDs = await Pattern.collection.find({
            $and: [{
              valenceUnits: { $in: arrayOfArrayOfValenceUnitIDs[combination[k]] },
            }, {
              valenceUnits: { $nin: excludedVUids },
            }],
          }).map(pattern => pattern._id).toArray();
        } else {
          patternsIDs = await Pattern.collection.find({
            _id: { $in: patternsIDs },
            valenceUnits: { $in: arrayOfArrayOfValenceUnitIDs[combination[k]] },
          }).map(pattern => pattern._id).toArray();
        }
        if (patternsIDs.length === 0) {
          return patternsIDs;
        }
      }
      patternsIDs = await Pattern.collection.aggregate([{
        $match: { _id: { $in: patternsIDs } },
      }, {
        $unwind: '$valenceUnits',
      }, {
        $match: { valenceUnits: { $in: [...merge] } },
      }, {
        $group: { _id: '$_id', count: { $sum: 1 } },
      }, {
        $match: { count: { $gte: i } },
      }, {
        $project: { _id: true },
      }]).map(pattern => pattern._id).toArray();
      if (patternsIDs.length === 0) {
        return patternsIDs;
      }
    }
  }
  return patternsIDs;
}

async function retrievePatternsIDs(context, next) {
  const startTime = utils.getStartTime();
  logger.debug(`Retrieving patternsIDs with withExtraCoreFEs = ${context.query.withExtraCoreFEs}`);
  const valenceUnitsIDs = context.valencer.results.tmp.valenceUnitsIDs;
  if (valenceUnitsIDs) {
    const patternsIDs = await getPatternsIDs(
      context.valencer.results.tmp.valenceUnitsIDs,
      context.valencer.results.tmp.excludedVUids);
    context.valencer.results.tmp.patternsIDs = patternsIDs || [];
  }
  logger.debug(`context.valencer.results.tmp.patternsIDs.length = ${context.valencer.results.tmp.patternsIDs.length}`);
  logger.verbose(`context.valencer.results.tmp.patternsIDs retrieved from database in ${utils.getElapsedTime(startTime)}ms`);
  return next();
}

module.exports = {
  retrievePatternsIDs,
};
