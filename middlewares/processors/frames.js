const config = require('./../../config');
const utils = require('./../../utils/utils');

const logger = config.logger;

function getFramesWithFrameModel(Frame, LexUnit) {
  return async function getFrames(annotationSets) {
    const lexUnits = await LexUnit.find().where('_id')
                                  .in(annotationSets.map(annoset => annoset.lexUnit));
    return Frame.find().where('_id')
                  .in(lexUnits.map(lexUnit => lexUnit.frame));
  };
}

async function getByAnnotationSets(context, next) {
  const startTime = utils.getStartTime();
  logger.info(`Querying for all Frames containing lexical units with a valence pattern matching: '${context.query.vp}'`);
  context.valencer.results.frames = await getFramesWithFrameModel(
    context.valencer.models.Frame,
    context.valencer.models.LexUnit)(context.valencer.results.annotationSets);
  logger.verbose(`${context.valencer.results.frames.length} unique Frames retrieved from database in ${utils.getElapsedTime(startTime)}ms`);
  return next();
}

module.exports = {
  getByAnnotationSets,
};