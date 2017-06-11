/**
 * The formatter manipulates the input query.
 * It transforms a raw valence pattern (defined as a (potentially partial)
 * combination of FE.PT.GF tags) to an array of array (first).
 */
 /**
  * The formatter manipulates the input query.
  * It transforms , and to an array of array with Frame Element ids then.
  */
const FrameElement = require('noframenet-core').FrameElement;
const utils = require('./../utils/utils');
const config = require('../config');

const logger = config.logger;

function getFormattedValencePattern(vp) {
  logger.debug(`Formatting valence pattern: ${vp}`);
  const formattedValencePattern = utils.toTokenArray(utils.toValenceArray(vp));
  logger.debug(`Formatted valence pattern: ${JSON.stringify(formattedValencePattern)}`);
  return formattedValencePattern;
}

/**
 * Converts a full string formatted valence pattern
 * 'FE_1.PT_1.GF_1+FE_2.PT_2.GF_2+...+FE_n.PT_n.GF_n'
 * to an array of array of tokens:
 * [['FE_1', 'PT_1', 'GF_1'], ['FE_2', 'PT_2', 'GF_2'], ..., ['FE_n', 'PT_n', 'GF_n']]
 */
function formatValencePatternToArrayOfArrayOfTokens(context, next) {
  context.valencer = {};
  context.valencer.query = {};
  context.valencer.query.vp = {};
  context.valencer.query.vp.raw = context.query.vp;
  context.valencer.query.vp.formatted = getFormattedValencePattern(context.query.vp);
  return next();
}

/**
 * Takes a full string formatted valencer pattern
 * [['FE_1', 'PT_1', 'GF_1'], ['FE_2', 'PT_2', 'GF_2'], ..., ['FE_n', 'PT_n',
 * 'GF_n']]
 * and replace each Frame Element name by an array of Frame Element ids
 * matching the given Frame Element name in the database.
 * Frame Element ids matching the given name
 * [[[fe_1_id_1,...,fe_1_id_n], 'PT_1', 'GF_1'], ...,
 * [[fe_n_id_1,...,fn_n_id_n], 'PT_n', 'GF_n']]
 */
async function getValenceUnitAsArrayWithFEids(valenceUnitAsArray) {
  const valenceUnitArrayWithFEids = [];
  for (const token of valenceUnitAsArray) {
    const fes = await FrameElement.find().where('name').equals(token);
    if (fes.length) {
      valenceUnitArrayWithFEids.add(fes.map(fe => fe._id));
    } else {
      valenceUnitArrayWithFEids.add(token);
    }
  }
  return valenceUnitArrayWithFEids;
}

async function getValencePatternAsArrayWithFEids(formattedVP) {
  return Promise.all(formattedVP
    .map(async vUnitArray => await getValenceUnitAsArrayWithFEids(vUnitArray)));
}

async function replaceFrameElementNamesByFrameElementIds(context, next) {
  context.valencer.query.vp.withFEids = await getValencePatternAsArrayWithFEids(context.valencer.query.vp.formatted);
  return next();
}

module.exports = {
  formatValencePatternToArrayOfArrayOfTokens,
  replaceFrameElementNamesByFrameElementIds,
};