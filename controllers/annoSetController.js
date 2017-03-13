import { AnnotationSet } from 'noframenet-core';
import getController from './getController';
import ApiError from './../exceptions/apiException';
import config from '../config';

const logger = config.logger;

async function getByNoPopulateID(context) {
  const startTime = process.hrtime();
  const annoSet = await AnnotationSet
    .findOne()
    .where('_id')
    .equals(context.params.id);
  if (!annoSet) {
    throw ApiError.NotFoundError(`Could not find AnnotationSet with _id = ${context.params.id}`);
  } else {
    context.body = annoSet;
    logger.verbose(`AnnotationSet retrieved from db in ${process.hrtime(startTime)[1] / 1000000}ms`);
  }
}

async function getByPopulateID(context) {
  const startTime = process.hrtime();
  const annoSet = await AnnotationSet
    .findOne()
    .where('_id')
    .equals(context.params.id)
    .populate([{
      path: 'pattern',
      populate: {
        path: 'valenceUnits',
      },
    }, {
      path: 'sentence',
    }, {
      path: 'lexUnit',
      populate: {
        path: 'frame',
        populate: [{
          path: 'lexUnits',
          select: 'name',
        }, {
          path: 'frameElements',
        }],
      },
    }, {
      path: 'labels',
    }]);
  if (!annoSet) {
    throw ApiError.NotFoundError(`Could not find AnnotationSet with _id = ${context.params.id}`);
  } else {
    context.body = annoSet;
    logger.verbose(`AnnotationSet retrieved from db in ${process.hrtime(startTime)[1] / 1000000}ms`);
  }
}

async function getByID(context) {
  logger.info(`Querying for AnnotationSet with _id = ${context.params.id}`);
  const populate = context.query.populate === 'true';
  logger.info(`Return populated documents: ${populate}`);
  if (populate) {
    await getByPopulateID(context);
  } else {
    await getByNoPopulateID(context);
  }
}

async function getByNoPopulateVP(context) {
  const startTime = process.hrtime();
  const annoSets = await AnnotationSet
    .find()
    .where('pattern')
    .in(context.patterns);
  logger.debug(`AnnotationSets.length = ${annoSets.length}`);
  context.body = annoSets;
  logger.verbose(`AnnotationSets retrieved from db in ${process.hrtime(startTime)[1] / 1000000}ms`);
}

async function getByPopulateVP(context) {
  const startTime = process.hrtime();
  const annoSets = await AnnotationSet
    .find()
    .where('pattern')
    .in(context.patterns)
    .populate([{
      path: 'pattern',
      populate: {
        path: 'valenceUnits',
      },
    }, {
      path: 'sentence',
    }, {
      path: 'lexUnit',
      populate: {
        path: 'frame',
        populate: [{
          path: 'lexUnits',
          select: 'name',
        }, {
          path: 'frameElements',
        }],
      },
    }, {
      path: 'labels',
    }]);
  logger.debug(`AnnotationSets.length = ${annoSets.length}`);
  context.body = annoSets;
  logger.verbose(`AnnotationSets retrieved from db in ${process.hrtime(startTime)[1] / 1000000}ms`);
}

async function getByVP(context) {
  logger.info(`Querying for all AnnotationSets with a valence pattern matching: ${context.query.vp}`);
  const strictVUMatching = context.query.strictVUMatching === 'true';
  const withExtraCoreFEs = context.query.withExtraCoreFEs !== 'false';
  const populate = context.query.populate === 'true';
  context.patterns = await getController.getPatterns(context.processedQuery, strictVUMatching, withExtraCoreFEs);
  logger.info(`Return populated documents: ${populate}`);
  if (populate) {
    await getByPopulateVP(context);
  } else {
    await getByNoPopulateVP(context);
  }
}

export default {
  getByID,
  getByVP,
};
