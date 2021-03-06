const Router = require('koa-router');
const compose = require('koa-compose');
const database = require('./middlewares/database');
const formatter = require('./middlewares/formatter');
const filter = require('./middlewares/filter');
const renderer = require('./middlewares/renderer');
const coreVU = require('./middlewares/core/valenceUnits');
const coreP = require('./middlewares/core/patterns');
const validator = require('./middlewares/validator');
const annotationSet = require('./middlewares/processors/annotationSet');
const annotationSets = require('./middlewares/processors/annotationSets');
const cluster = require('./middlewares/processors/cluster');
const feHierarchy = require('./middlewares/processors/feHierarchy');
const frame = require('./middlewares/processors/frame');
const frameElement = require('./middlewares/processors/frameElement');
const frames = require('./middlewares/processors/frames');
const frameHierarchy = require('./middlewares/processors/frameHierarchy');
const lexUnit = require('./middlewares/processors/lexUnit');
const lexUnits = require('./middlewares/processors/lexUnits');
const pattern = require('./middlewares/processors/pattern');
const patterns = require('./middlewares/processors/patterns');
const valenceUnit = require('./middlewares/processors/valenceUnit');
const valenceUnits = require('./middlewares/processors/valenceUnits');
const utils = require('./utils/utils');
const config = require('./config');

/* eslint-disable max-len */

const pkgVersion = process.env.npm_package_version;
const apiVersion = `/v${pkgVersion.split('.')[0]}`;

const logger = config.logger;

const valencer = new Router({
  prefix: apiVersion,
});

const router = new Router();

async function initializeValencerContext(context, next) {
  context.valencer = {
    config,
    dbs: await database.getDBlist(),
    dbName: '',
    models: {},
    query: {
      vp: {
        raw: '',
        formatted: [],
        withFEids: [],
        feName: '',
        hasUDtags: false,
        hasPENNtags: false,
        rawMatches: [],
      },
      frameName: '',
      feNamesSet: new Set(),
      projections: {},
      populations: [],
      format: '',
      skip: 0,
      limit: 10,
    },
    results: {
      tmp: {
        valenceUnitsIDs: [],
        excludedFEids: [],
        excludedVUids: [],
        patternsIDs: [],
        filteredPatternsIDs: [],
      },
      annotationSets: [],
      cluster: [],
      feHierarchy: {},
      frameHierarchy: {},
      frames: [],
      lexUnits: [],
      patterns: [],
      valenceUnits: [],
    },
    startTime: utils.getStartTime(),
  };
  if (Object.keys(context.query).length) {
    logger.info(`Processing query ${JSON.stringify(context.query)}`);
  }
  return next();
}

function displayQueryExecutionTime(context, next) {
  logger.info(`Query ${JSON.stringify(context.query)} processed in ${utils.getElapsedTime(context.valencer.startTime)}ms`);
  return next();
}

const validateAndFormatIDquery = compose([
  initializeValencerContext,
  validator.validatePathToDB,
  validator.validateParamsNotEmpty,
  validator.validateParamsIDnotEmpty,
  validator.validateParamsIDisNumberOrObjectID,
  validator.validateProjectionString,
  validator.validatePopulationString,
  formatter.formatProjectionString,
  formatter.formatPopulationString,
  database.connect(),
]);

const validateAndFormatFrameNameQuery = compose([
  initializeValencerContext,
  validator.validatePathToDB,
  validator.validateQueryNotEmpty,
  validator.validateQueryFrameName,
  validator.validateProjectionString,
  formatter.formatProjectionString,
  database.connect(),
]);

const validateFormatAndProcessVPquery = compose([
  initializeValencerContext,
  validator.validatePathToDB,
  validator.validateQueryNotEmpty,
  validator.validateQueryVPnotEmpty,
  validator.validateQueryVPcontainsNoInvalidCharacters,
  validator.validateQueryVPcontainsNoInvalidSequence,
  validator.validateQueryVPvalenceUnitLength,
  validator.validateQueryStrictVUmatchingParameter,
  validator.validateQueryWithExtraCoreFEsParameter,
  validator.validateProjectionString,
  validator.validatePopulationString,
  validator.validateQuerySkipParameter,
  validator.validateQueryLimitParameter,
  formatter.formatProjectionString,
  formatter.formatPopulationString,
  database.connect(),
  formatter.formatValencePatternToArrayOfArrayOfTokens,
  formatter.convertPTandGFtoFNstyle,
  formatter.formatMatchingVPqueries,
  validator.validateQueryFormatAfterMapping,
  formatter.replaceFrameElementNamesByFrameElementIds,
  validator.validateQueryParametersCombination, // Needs to be done after formatting
  coreVU.retrieveValenceUnitsIDs,
  coreVU.retrieveExcludedVUIDs,
  coreP.retrievePatternsIDs,
  filter.filterPatternsIDs,
]);

const validateFormatAndProcessVPqueryForHierarchy = compose([
  initializeValencerContext,
  validator.validatePathToDB,
  validator.validateQueryNotEmpty,
  validator.validateQueryVPnotEmpty,
  validator.validateQueryVPcontainsNoInvalidCharacters,
  validator.validateQueryVPcontainsNoInvalidSequence,
  validator.validateQueryVPvalenceUnitLength,
  validator.validateQueryStrictVUmatchingParameter,
  validator.validateQueryWithExtraCoreFEsParameter,
  validator.validateProjectionString,
  formatter.formatProjectionString,
  database.connect(),
  formatter.formatValencePatternToArrayOfArrayOfTokens,
  formatter.extractFEnamesSet,
]);

const validateFormatAndProcessVUquery = compose([
  initializeValencerContext,
  validator.validatePathToDB,
  validator.validateQueryNotEmpty,
  validator.validateQueryVUnotEmpty,
  validator.validateQueryVUcontainsNoInvalidCharacters,
  validator.validateQueryVUlength,
  validator.validateProjectionString,
  validator.validatePopulationString,
  validator.validateQuerySkipParameter,
  validator.validateQueryLimitParameter,
  formatter.formatProjectionString,
  formatter.formatPopulationString,
  database.connect(),
  (context, next) => { context.query.vp = context.query.vu; return next(); },
  formatter.formatValencePatternToArrayOfArrayOfTokens,
  formatter.replaceFrameElementNamesByFrameElementIds,
  coreVU.retrieveValenceUnitsIDs,
]);


/**
* @apiDefine NotFoundIDError
* @apiVersion 5.0.0
* @apiError (Error 404) NotFoundError The id was not found in the database
*/

/**
* @apiDefine NotFoundVPError
* @apiVersion 5.0.0
* @apiError (Error 404) NotFoundError At least one valence unit composing the
* input vp was not found in the database
*/

/**
* @apiDefine NotFoundNameError
* @apiVersion 5.0.0
* @apiError (Error 404) NotFoundError The Frame name was not found in the database
*/

/**
* @apiDefine InvalidQuery
* @apiVersion 5.0.0
* @apiError (Error 400) InvalidQuery The specified <code>langIsoCode</code> or
* <code>datasetVersion</code> is not supported; the database corresponding to
* the language ISO639-1 and dataset version is supported but not up and
* running; the specified query is empty, null or undefined
*/

/**
* @apiDefine InvalidParams
* @apiVersion 5.0.0
* @apiError (Error 400) InvalidParams The specified <code>id</code> is empty,
* null, undefined, or is specified but is neither a <code>Number</code> nor a
* valid <code>ObjectID</code>
*/

/**
* @apiDefine InvalidQueryParams
* @apiVersion 5.0.0
* @apiError (Error 400) InvalidQueryParams The <code>vp</code> parameter contains either
* an invalid character, an invalid sequence of characters or more than 3
* tokens separated by a dot in at least one of its valence units; the
* <code>strictVUMatching</code> parameter is neither <code>true</code> nor
* <code>false</code>; the <code>withExtraCoreFEs</code> parameter is neither
* <code>true</code> nor <code>false</code>
*/

/**
* @apiDefine InvalidQueryNameParam
* @apiVersion 5.0.0
* @apiError (Error 400) InvalidParams The specified <code>frameName</code> is empty,
* null, undefined, or is specified but is not a proper ascii <code>String</code>
*/

/**
* @apiDefine apiConfig
* @apiVersion 5.0.0
* @apiParam {String}    langIsoCode   Set the language ISO639-1 code. Ex: 'en' for English
* @apiParam {Number}    datasetVersion    Set the version of the FrameNet
* dataset, in semver format. Ex: '170' for the FrameNet 1.7 data release
*/

/**
* @apiDefine projPop
* @apiVersion 5.0.0
* @apiParam {String}   [projection] Set the fields to be projected in the output
* documents. Projection is the process of returning only
* requested fields from input documents. See [project](https://docs.mongodb.com/manual/reference/operator/aggregation/project/index.html)
* in the MongoDB documentation and
* usage details in the [Optional Parameters](#opt) section.
* @apiParam {String}   [population] Set the fields to be populated in the output documents.
* Population is the process of automatically
* replacing the specified paths in the document with document(s) from other collection(s).
* See [populate](http://mongoosejs.com/docs/populate.html) in the Mongoose documentation and
* usage details in the [Optional Parameters](#opt) section.
*/

/**
* @apiDefine vpParam
* @apiVersion 5.0.0
* @apiParam {String}     vp          Set the Valence Pattern: a
* combination of triplets FE.PT.GF
* @apiParam {Boolean}    [strictVUMatching=false]     Specify whether
* the number of valence units should match exactly. Ex: Querying for
* Donor.NP.Ext with strictVUMatching=true will return all patterns with only
* one valenceUnit
* @apiParam {Boolean}    [withExtraCoreFEs=true] Specify whether, in cases of
* non-strict valence unit matching, extra Frame Elements can be core FEs.
*/

/**
* @apiDefine skipLimit
* @apiVersion 5.0.0
* @apiParam {Number}   [skip=0] Set the number of documents to skip before returning.
* @apiParam {Number}   [limit=10] Set the number of documents to return.
* Set to 0 to return all possible documents.
*/

/**
* @apiDefine AnnotationSetSuccess
* @apiVersion 5.0.0
* @apiSuccess  {Number}   _id        The AnnotationSet id
* @apiSuccess  {Number}   lexUnit    The LexUnit id
* @apiSuccess  {Number}   sentence   The Sentence id
* @apiSuccess  {Object}   pattern    The Pattern ObjectID
* @apiSuccess  {Object[]} labels     The list of Label ObjectIDs
*/

/**
* @apiDefine ClusterFrameSuccess
* @apiVersion 5.0.0
* @apiSuccess   {Number}    data.id         The Frame or FrameRelation id
* @apiSuccess   {String}    data.name       The Frame name
* @apiSuccess   {Number}    data.source     The source FrameRelation
* @apiSuccess   {Number}    data.target     The target FrameRelation
* @apiSuccess   {String}    data.type       The FrameRelation name
*/

/**
* @apiDefine ClusterLexUnitSuccess
* @apiVersion 5.0.0
* @apiSuccess   {Number}    data.id         The LexUnit id
* @apiSuccess   {String}    data.name       The LexUnit name
* @apiSuccess   {String}    data.frame      The Frame name
* @apiSuccess   {Number}    data.source     The LexUnit.Frame id
* @apiSuccess   {Number}    data.target     The LexUnit id
* @apiSuccess   {String}    data.type       The relation type ("frame")
*/

/**
* @apiDefine FEhierarchySuccess
* @apiVersion 5.0.0
* @apiSuccess   {Object}      _id        The FEhierarchy ObjectID
* @apiSuccess   {String}      name       The input FrameElement name
* @apiSuccess   {Object[]}    children   The FEhierarchy elements for which the corresponding FEs inherit from the input FE
* @apiSuccess   {Object[]}    parents    The FEhierarchy elements from which the input FE inherits
*/

/**
* @apiDefine FrameHierarchySuccess
* @apiVersion 5.0.0
* @apiSuccess   {Object}      _id        The FrameHierarchy ObjectID
* @apiSuccess   {String}      name       The input Frame name
* @apiSuccess   {Object[]}    children   The FrameHierarchy elements for which the corresponding Frames inherit from the input Frame
* @apiSuccess   {Object[]}    parents    The FrameHierarchy elements from which the input Frame inherits
*/

/**
 * @apiDefine FrameSuccess
 * @apiVersion 5.0.0
 * @apiSuccess   {Number}    _id            The Frame id
 * @apiSuccess   {String}    name           The Frame name
 * @apiSuccess   {String}    definition     The Frame definition
 * @apiSuccess   {String}    cDate          The Frame creation date
 * @apiSuccess   {String}    cBy            The Frame annotator
 * @apiSuccess   {Number[]}  semTypes       The Frame SemType ids
 * @apiSuccess   {Number[]}  lexUnits       The Frame LexUnit ids
 * @apiSuccess   {Number[]}  feCoreSets     The Frame
 * minimal set of core FrameElement ids
 * @apiSuccess   {Number[]}  frameElements  The Frame FrameElement ids
 */

/**
 * @apiDefine FrameElementSuccess
 * @apiVersion 5.0.0
 * @apiSuccess   {Number}    _id            The FrameElement id
 * @apiSuccess   {String}    name           The FrameElement name
 * @apiSuccess   {String}    definition     The FrameElement definition
 * @apiSuccess   {String}    coreType       The FrameElement core type (Core, Peripheral, etc.)
 * @apiSuccess   {String}    cDate          The FrameElement creation date
 * @apiSuccess   {String}    cBy            The FrameElement annotator
 * @apiSuccess   {String}    fgColor        The FrameElement annotation frontground color
 * @apiSuccess   {String}    bgColor        The FrameElement annotation background color
 * @apiSuccess   {String}    abbrev         The FrameElement name abbreviation
 * @apiSuccess   {Number[]}  semTypes       The FrameElement SemType ids
 * @apiSuccess   {Number[]}  excludes       The FrameElement ids excluded by this FrameElement
 * @apiSuccess   {Number[]}  requires       The FrameElement ids required by this FrameElement
 */

/**
 * @apiDefine LexUnitSuccess
 * @apiVersion 5.0.0
 * @apiSuccess   {Number}    _id                  The LexUnit id
 * @apiSuccess   {String}    name                 The LexUnit name
 * @apiSuccess   {String}    pos                  The LexUnit part of speech
 * @apiSuccess   {String}    definition           The LexUnit definition
 * @apiSuccess   {Number}    lemmaID              The LexUnit lemmaID
 * @apiSuccess   {Number}    frame                The LexUnit Frame id
 * @apiSuccess   {String}    status         The LexUnit status
 * @apiSuccess   {String}    cBy            The LexUnit annotator
 * @apiSuccess   {String}    cDate          The LexUnit creation date
 * @apiSuccess   {Number[]}  semTypes       The LexUnit SemType ids
 * @apiSuccess   {Number[]}  lexemes        The LexUnit Lexeme ids
 */

/**
 * @apiDefine PatternSuccess
 * @apiVersion 5.0.0
 * @apiSuccess   {Object}    _id            The Pattern ObjectID
 * @apiSuccess   {Object[]}  valenceUnits   The Pattern ValenceUnits ObjectIDs
 */

/**
 * @apiDefine ValenceUnitSuccess
 * @apiVersion 5.0.0
 * @apiSuccess   {Object}  _id  The ObjectID
 * @apiSuccess   {String}  FE   The frame element name
 * @apiSuccess   {String}  PT   The phrase type
 * @apiSuccess   {String}  GF   The grammatical function
 */

/**
 * @api {get} /annoSet/:id/:projection/:population
 * GetAnnoSet
 * @apiVersion 5.0.0
 * @apiName GetAnnoSet
 * @apiGroup AnnotationSet
 * @apiDescription Get AnnotationSet with id. Returns at most one
 * document and throws an error if not found
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiParam {Number}  id  Set the AnnotationSet id
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/annoSet/2614616"
 * @apiExample Projection/Population
 * # Projecting lexUnit and sentence ids and populating both
 * curl -i "http://localhost:3030/v5/en/170/annoSet/2614616/sentence,lexUnit/sentence,lexUnit"
 * @apiUse AnnotationSetSuccess
 * @apiUse NotFoundIDError
 * @apiUse InvalidQuery
 * @apiUse InvalidParams
 */
router.get('/annoSet/:id',
           validateAndFormatIDquery,
           annotationSet.getByID);

router.get('/annoSet/:id/:projection',
           validateAndFormatIDquery,
           annotationSet.getByID);

router.get('/annoSet/:id/:projection/:population',
           validateAndFormatIDquery,
           annotationSet.getByID);

/**
 * @api {get} /annoSets/:projection/:population?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs&skip=:skip&limit=:limit
 * GetAnnoSets
 * @apiVersion 5.0.0
 * @apiName GetAnnoSets
 * @apiGroup AnnotationSet
 * @apiDescription Get all AnnotationSets with pattern matching input
 * vp. Returns an empty array if no match is found
 * @apiUse vpParam
 * @apiUse skipLimit
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/annoSets?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Projection/Population
 * # Projecting and populating the sentence field
 * curl -i "http://localhost:3030/v5/en/170/annoSets/sentence/sentence?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Skip/Limit
 * # Getting 20 documents skipping the first 10
 * curl -i "http://localhost:3030/v5/en/170/annoSets?vp=Donor.NP.Ext+Theme.NP.Obj&skip=10&limit=20"
 * @apiUse AnnotationSetSuccess
 * @apiUse NotFoundVPError
 * @apiUse InvalidQuery
 * @apiUse InvalidQueryParams
 */
router.get('/annoSets',
           validateFormatAndProcessVPquery,
           annotationSets.getByValencePattern,
           renderer.renderAnnotationSets,
           displayQueryExecutionTime);

router.get('/annoSets/:projection',
           validateFormatAndProcessVPquery,
           annotationSets.getByValencePattern,
           renderer.renderAnnotationSets,
           displayQueryExecutionTime);

router.get('/annoSets/:projection/:population',
           validateFormatAndProcessVPquery,
           annotationSets.getByValencePattern,
           renderer.renderAnnotationSets,
           displayQueryExecutionTime);

/**
  * @api {get} /cluster/frames?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs
  * GetClusterFrames
  * @apiVersion 5.0.0
  * @apiName GetClusterFrames
  * @apiGroup Cluster
  * @apiDescription Get [cytoscape](http://js.cytoscape.org/index.html)-formatted
  * frames and frame relations for frames with pattern matching input vp. Used
  * to display frames as clusters. Note that this route returns all possible
  * documents and does
  * not rely on skip/limit parameters.
  * @apiUse vpParam
  * @apiUse apiConfig
  * @apiExample Default
  * # Default usage (no option set)
  * curl -i "http://localhost:3030/v5/en/170/cluster/frames?vp=Donor.NP.Ext+Theme.NP.Obj"
  * @apiUse ClusterFrameSuccess
  * @apiUse NotFoundVPError
  * @apiUse InvalidQuery
  * @apiUse InvalidQueryParams
  */
router.get('/cluster/frames',
           initializeValencerContext,
           validator.validatePathToDB,
           validator.validateQueryNotEmpty,
           validator.validateQueryVPnotEmpty,
           validator.validateQueryVPcontainsNoInvalidCharacters,
           validator.validateQueryVPcontainsNoInvalidSequence,
           validator.validateQueryVPvalenceUnitLength,
           validator.validateQueryStrictVUmatchingParameter,
           validator.validateQueryWithExtraCoreFEsParameter,
           (context, next) => { context.valencer.query.limit = 0; return next(); },
           database.connect(),
           formatter.formatValencePatternToArrayOfArrayOfTokens,
           formatter.replaceFrameElementNamesByFrameElementIds,
           validator.validateQueryParametersCombination, // Needs to be done after formatting
           coreVU.retrieveValenceUnitsIDs,
           coreVU.retrieveExcludedVUIDs,
           coreP.retrievePatternsIDs,
           filter.filterPatternsIDs,
           frames.getByVP,
           cluster.getFrames,
           renderer.renderCluster,
           displayQueryExecutionTime);

/**
  * @api {get} /cluster/lexUnits?vp=:vp&frameID=:frameID&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs
  * GetClusterLexUnits
  * @apiVersion 5.0.0
  * @apiName GetClusterLexUnits
  * @apiGroup Cluster
  * @apiDescription Get [cytoscape](http://js.cytoscape.org/index.html)-formatted
  * lexUnits for lexUnits with pattern matching input vp and frame matching
  * frameID. Used
  * to display lexUnits as clusters. Note that this route returns all possible
  * documents and does
  * not rely on skip/limit parameters.
  * @apiUse vpParam
  * @apiUse apiConfig
  * @apiParam {Number}  frameID  Set the frame id
  * @apiExample Default
  * curl -i "http://localhost:3030/v5/en/170/cluster/lexUnits?vp=Donor.NP.Ext+Theme.NP.Obj&frameID=139"
  * @apiUse ClusterLexUnitSuccess
  * @apiUse NotFoundVPError
  * @apiUse InvalidQuery
  * @apiUse InvalidQueryParams
  */
router.get('/cluster/lexUnits',
           initializeValencerContext,
           validator.validatePathToDB,
           validator.validateQueryNotEmpty,
           validator.validateQueryVPnotEmpty,
           validator.validateQueryVPcontainsNoInvalidCharacters,
           validator.validateQueryVPcontainsNoInvalidSequence,
           validator.validateQueryVPvalenceUnitLength,
           validator.validateQueryStrictVUmatchingParameter,
           validator.validateQueryWithExtraCoreFEsParameter,
           validator.validateQueryFrameIDparameter,
           (context, next) => { context.valencer.query.limit = 0; return next(); },
           database.connect(),
           formatter.formatValencePatternToArrayOfArrayOfTokens,
           formatter.replaceFrameElementNamesByFrameElementIds,
           validator.validateQueryParametersCombination, // Needs to be done after formatting
           coreVU.retrieveValenceUnitsIDs,
           coreVU.retrieveExcludedVUIDs,
           coreP.retrievePatternsIDs,
           filter.filterPatternsIDs,
           lexUnits.getByVP,
           cluster.getLexUnits,
           renderer.renderCluster,
           displayQueryExecutionTime);


/**
* @api {get} /feHierarchy/:projection?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs
* GetFEhierarchy
* @apiVersion 5.0.0
* @apiName GetFEhierarchy
* @apiGroup Hierarchy
* @apiDescription Get the FEHierarch(ies) for the FE names specified in the input vp. Returns an
* empty object if no match is found. Note that the population parameter is useless.
* parents and children are only specified for the head node of the tree.
* All embedded elements only specify one of the other (children for children nodes
* and parents for parents nodes).
* @apiUse vpParam
* @apiUse apiConfig
* @apiUse projPop
* @apiExample Default
* # Default usage (no option set)
* curl -i "http://localhost:3030/v5/en/170/feHierarchy?vp=Donor.NP.Ext+Theme.NP.Obj"
* # Projecting the children field
* curl -i "http://localhost:3030/v5/en/170/feHierarchy/children?vp=Donor.NP.Ext+Theme.NP.Obj"
* @apiUse FEhierarchySuccess
* @apiUse NotFoundVPError
* @apiUse InvalidQuery
* @apiUse InvalidQueryParams
*/
router.get('/feHierarchy',
           validateFormatAndProcessVPqueryForHierarchy,
           feHierarchy.getByVP,
           renderer.renderFEhierarchy,
           displayQueryExecutionTime);

router.get('/feHierarchy/:projection',
           validateFormatAndProcessVPqueryForHierarchy,
           feHierarchy.getByVP,
           renderer.renderFEhierarchy,
           displayQueryExecutionTime);

/**
* @api {get} /frameHierarchy/:projection?frameName=:frameName
* GetFrameHierarchy
* @apiVersion 5.0.0
* @apiName GetFrameHierarchy
* @apiGroup Hierarchy
* @apiDescription Get the FrameHierarchy for the input Frame name.
* Throws an error if the specified Frame name is not found.
* @apiUse apiConfig
* @apiExample Default
* curl -i "http://localhost:3030/v5/en/170/frameHierarchy/Abandonment"
* @apiUse FrameHierarchySuccess
* @apiUse NotFoundNameError
* @apiUse InvalidQuery
* @apiUse InvalidQueryNameParam
*/
router.get('/frameHierarchy',
           validateAndFormatFrameNameQuery,
           frameHierarchy.getByName);

router.get('/frameHierarchy/:projection',
           validateAndFormatFrameNameQuery,
           frameHierarchy.getByName);

/**
 * @api {get} /frame/:id/:projection/:population
 * GetFrame
 * @apiVersion 5.0.0
 * @apiName GetFrame
 * @apiGroup Frame
 * @apiDescription Get Frame with id. Returns at most one
 * document and throws an error if not found
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiParam {Number}  id  The Frame id
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/frame/42"
 * @apiExample Projection/Population
 * # Projecting and populating the frameElements field
 * curl -i "http://localhost:3030/v5/en/170/frame/42/frameElements/frameElements"
 * @apiUse FrameSuccess
 * @apiUse NotFoundIDError
 * @apiUse InvalidQuery
 * @apiUse InvalidParams
 */
router.get('/frame/:id',
           validateAndFormatIDquery,
           frame.getByID);

router.get('/frame/:id/:projection',
           validateAndFormatIDquery,
           frame.getByID);

router.get('/frame/:id/:projection/:population',
           validateAndFormatIDquery,
           frame.getByID);

/**
 * @api {get} /frames/:projection/:population?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs&skip=:skip&limit=:limit
 * GetFrames
 * @apiVersion 5.0.0
 * @apiName GetFrames
 * @apiGroup Frame
 * @apiDescription Get all Frames with pattern matching input vp. Returns an
 * empty array if no match is found
 * @apiUse vpParam
 * @apiUse skipLimit
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/frames?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Projection/Population
 * # Projecting and populating the frameElements field
 * curl -i "http://localhost:3030/v5/en/170/frames/frameElements/frameElements?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Skip/Limit
 * # Getting 20 documents skipping the first 10
 * curl -i "http://localhost:3030/v5/en/170/frames?vp=Theme.NP.Obj&skip=10&limit=20"
 * @apiUse FrameSuccess
 * @apiUse NotFoundVPError
 * @apiUse InvalidQuery
 * @apiUse InvalidQueryParams
 */
router.get('/frames',
           validateFormatAndProcessVPquery,
           frames.getByVP,
           renderer.renderFrames,
           displayQueryExecutionTime);

router.get('/frames/:projection',
           validateFormatAndProcessVPquery,
           frames.getByVP,
           renderer.renderFrames,
           displayQueryExecutionTime);

router.get('/frames/:projection/:population',
           validateFormatAndProcessVPquery,
           frames.getByVP,
           renderer.renderFrames,
           displayQueryExecutionTime);

/**
 * @api {get} /frameElement/:id/:projection/:population
 * GetFrameElement
 * @apiVersion 5.0.0
 * @apiName GetFrameElement
 * @apiGroup FrameElement
 * @apiDescription Get FrameElement with id. Returns at most one
 * document and throws an error if not found
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiParam {Number}  id  The FrameElement id
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/frameElement/42"
 * @apiExample Projection/Population
 * # Projecting no fields and populating the semTypes field
 * curl -i "http://localhost:3030/v5/en/170/frameElement/42/,/semTypes"
 * @apiUse FrameElementSuccess
 * @apiUse NotFoundIDError
 * @apiUse InvalidQuery
 * @apiUse InvalidParams
 */
router.get('/frameElement/:id',
           validateAndFormatIDquery,
           frameElement.getByID);

router.get('/frameElement/:id/:projection',
           validateAndFormatIDquery,
           frameElement.getByID);

router.get('/frameElement/:id/:projection/:population',
           validateAndFormatIDquery,
           frameElement.getByID);

/**
 * @api {get} /lexUnit/:id/:projection/:population
 * GetLexUnit
 * @apiVersion 5.0.0
 * @apiName GetLexUnit
 * @apiGroup LexUnit
 * @apiDescription Get LexUnit with id. Returns at most one
 * document and throws an error if not found
 * @apiParam {Number}  id  The LexUnit id
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/lexUnit/42"
 * @apiExample Projection/Population
 * # Projecting and populating the frame and frame.frameElements fields
 * curl -i "http://localhost:3030/v5/en/170/lexUnit/42/frame/frame,frame.frameElements"
 * @apiUse LexUnitSuccess
 * @apiUse NotFoundIDError
 * @apiUse InvalidQuery
 * @apiUse InvalidParams
 */
router.get('/lexUnit/:id',
           validateAndFormatIDquery,
           lexUnit.getByID);

router.get('/lexUnit/:id/:projection',
           validateAndFormatIDquery,
           lexUnit.getByID);

router.get('/lexUnit/:id/:projection/:population',
           validateAndFormatIDquery,
           lexUnit.getByID);

/**
 * @api {get} /lexUnits/:projection/:population?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs&skip=:skip&limit=:limit
 * GetLexUnits
 * @apiVersion 5.0.0
 * @apiName GetLexUnits
 * @apiGroup LexUnit
 * @apiDescription Get all LexUnits with pattern matching input vp. Returns an
 * empty array if no match is found
 * @apiUse vpParam
 * @apiUse skipLimit
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * curl -i "http://localhost:3030/v5/en/170/lexUnits?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Projection/Population
 * # Projecting and populating the lexemes field
 * curl -i "http://localhost:3030/v5/en/170/lexUnits/lexemes/lexemes?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Skip/Limit
 * # Getting 3 documents skipping the first 5
 * curl -i "http://localhost:3030/v5/en/170/lexUnits?vp=Donor.NP.Ext+Theme.NP.Obj&skip=5&limit=3"
 * @apiUse LexUnitSuccess
 * @apiUse NotFoundVPError
 * @apiUse InvalidQuery
 * @apiUse InvalidQueryParams
 */
router.get('/lexUnits',
           validateFormatAndProcessVPquery,
           lexUnits.getByVP,
           renderer.renderLexUnits,
           displayQueryExecutionTime);

router.get('/lexUnits/:projection',
           validateFormatAndProcessVPquery,
           lexUnits.getByVP,
           renderer.renderLexUnits,
           displayQueryExecutionTime);

router.get('/lexUnits/:projection/:population',
           validateFormatAndProcessVPquery,
           lexUnits.getByVP,
           renderer.renderLexUnits,
           displayQueryExecutionTime);

/**
 * @api {get} /pattern/:id/:projection/:population
 * GetPattern
 * @apiVersion 5.0.0
 * @apiName GetPattern
 * @apiGroup Pattern
 * @apiDescription Get Pattern with id. Returns at most one
 * document and throws an error if not found
 * @apiParam {Object}  id  The Pattern ObjectID
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/pattern/5a62f8b0e3bf318cbabc4beb"
 * @apiExample Projection/Population
 * # Projecting and populating the valenceUnits field
 * curl -i "http://localhost:3030/v5/en/170/pattern/5a62f8b0e3bf318cbabc4beb/valenceUnits/valenceUnits"
 * @apiUse PatternSuccess
 * @apiUse NotFoundIDError
 * @apiUse InvalidQuery
 * @apiUse InvalidParams
 */
router.get('/pattern/:id',
           validateAndFormatIDquery,
           pattern.getByID);

router.get('/pattern/:id/:projection',
           validateAndFormatIDquery,
           pattern.getByID);

router.get('/pattern/:id/:projection/:population',
           validateAndFormatIDquery,
           pattern.getByID);

/**
 * @api {get} /patterns/:projection/:population?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs&skip=:skip&limit=:limit
 * GetPatterns
 * @apiVersion 5.0.0
 * @apiName GetPatterns
 * @apiGroup Pattern
 * @apiDescription Get all Patterns with pattern matching input vp. Returns an
 * empty array if no match is found
 * @apiUse vpParam
 * @apiUse skipLimit
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/patterns?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Projection/Population
 * # Projecting and populating the valenceUnits field
 * curl -i "http://localhost:3030/v5/en/170/patterns/valenceUnits/valenceUnits?vp=Donor.NP.Ext+Theme.NP.Obj"
 * @apiExample Skip/Limit
 * # Getting 20 documents skipping the first 10
 * curl -i "http://localhost:3030/v5/en/170/patterns?vp=Donor.NP.Ext+Theme.NP.Obj&skip=10&limit=20"
 * @apiUse PatternSuccess
 * @apiUse NotFoundVPError
 * @apiUse InvalidQuery
 * @apiUse InvalidQueryParams
*/
router.get('/patterns',
           validateFormatAndProcessVPquery,
           patterns.getFromIDs,
           renderer.renderPatterns,
           displayQueryExecutionTime);

router.get('/patterns/:projection',
           validateFormatAndProcessVPquery,
           patterns.getFromIDs,
           renderer.renderPatterns,
           displayQueryExecutionTime);

router.get('/patterns/:projection/:population',
           validateFormatAndProcessVPquery,
           patterns.getFromIDs,
           renderer.renderPatterns,
           displayQueryExecutionTime);

/**
 * @api {get} /valenceUnit/:id/:projection/:population
 * GetValenceUnit
 * @apiVersion 5.0.0
 * @apiName GetValenceUnit
 * @apiGroup ValenceUnit
 * @apiDescription Get ValenceUnit with id. Returns at most one
 * document and throws an error if not found
 * @apiParam {Object}  id  The ValenceUnit ObjectID
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/valenceUnit/5a62f8b0e3bf318cbabc4be7"
 * @apiExample Projection/Population
 * # Projecting and populating the FE field
 *  curl -i "http://localhost:3030/v5/en/170/valenceUnit/5a62f8b0e3bf318cbabc4be7/FE/FE"
 * @apiUse ValenceUnitSuccess
 * @apiUse NotFoundIDError
 * @apiUse InvalidQuery
 * @apiUse InvalidParams
 */
router.get('/valenceUnit/:id',
           validateAndFormatIDquery,
           valenceUnit.getByID);

router.get('/valenceUnit/:id/:projection',
           validateAndFormatIDquery,
           valenceUnit.getByID);

router.get('/valenceUnit/:id/:projection/:population',
           validateAndFormatIDquery,
           valenceUnit.getByID);

/**
 * @api {get} /valenceUnits/:projection/:population?vp=:vp&strictVUMatching=:strictVUMatching&withExtraCoreFEs=:withExtraCoreFEs&skip=:skip&limit=:limit
 * GetValenceUnits
 * @apiVersion 5.0.0
 * @apiName GetValenceUnits
 * @apiGroup ValenceUnit
 * @apiDescription Get all ValenceUnits with pattern matching input vp. Returns
 * an empty array if no match is found
 * @apiParam {String}  vu  The ValenceUnit: a single triplet FE.PT.GF. Can be
 * a partial triplet: FE, FE.PT, FE.GF, PT.GF, in any order: GF.FE, PT.FE, etc.
 * @apiUse apiConfig
 * @apiUse projPop
 * @apiExample Default
 * # Default usage (no option set)
 * curl -i "http://localhost:3030/v5/en/170/valenceUnits?vu=Donor.NP.Ext"
 * @apiExample Projection/Population
 * # Projecting and populating the FE field
 * curl -i "http://localhost:3030/v5/en/170/valenceUnits/FE/FE?vu=Donor.NP.Ext"
 * @apiExample Skip/Limit
 * # Getting 1 documents skipping the first
 * curl -i "http://localhost:3030/v5/en/170/valenceUnits?vu=Donor.NP.Ext&skip=1&limit=1"
 * @apiUse ValenceUnitSuccess
 * @apiUse NotFoundVPError
 * @apiUse InvalidQuery
 * @apiUse InvalidQueryParams
 */
router.get('/valenceUnits',
           validateFormatAndProcessVUquery,
           valenceUnits.getFromIDs,
           renderer.renderValenceUnits,
           displayQueryExecutionTime);

router.get('/valenceUnits/:projection',
           validateFormatAndProcessVUquery,
           valenceUnits.getFromIDs,
           renderer.renderValenceUnits,
           displayQueryExecutionTime);

router.get('/valenceUnits/:projection/:population',
           validateFormatAndProcessVUquery,
           valenceUnits.getFromIDs,
           renderer.renderValenceUnits,
           displayQueryExecutionTime);

valencer.use('/:langIsoCode/:datasetVersion', router.routes());

module.exports = valencer;
