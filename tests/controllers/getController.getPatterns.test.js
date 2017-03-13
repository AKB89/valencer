import chai from 'chai';
import mongoose from 'mongoose';
import mockgoose from 'mockgoose';
import { FrameElement, Pattern, ValenceUnit } from 'noframenet-core';
import getController from './../../controllers/getController';

const should = chai.should();

describe('getController#getPatterns', () => {
  before(async () => {
    await mockgoose(mongoose);
    await mongoose.connect('mongodb://valencer.io/tests');
    mockgoose.reset();
    const aFE = new FrameElement({
      _id: 1,
      name: 'A',
    });
    await aFE.save();
    const bFE = new FrameElement({
      _id: 2,
      name: 'B',
    });
    await bFE.save();
    const cFE = new FrameElement({
      _id: 3,
      name: 'C',
    });
    await cFE.save();
    const dFE = new FrameElement({
      _id: 4,
      name: 'D',
    });
    await dFE.save();
    const aNPObj = new ValenceUnit({
      FE: 1,
      PT: 'NP',
      GF: 'Obj',
    });
    await aNPObj.save();
    const bNPObj = new ValenceUnit({
      FE: 2,
      PT: 'NP',
      GF: 'Obj',
    });
    await bNPObj.save();
    const cNPExt = new ValenceUnit({
      FE: 3,
      PT: 'NP',
      GF: 'Ext',
    });
    await cNPExt.save();
    const dPPaboutExt = new ValenceUnit({
      FE: 4,
      PT: 'PP[about]',
      GF: 'Ext',
    });
    await dPPaboutExt.save();
    const pattern1 = new Pattern({
      valenceUnits: [aNPObj, dPPaboutExt],
    });
    await pattern1.save();
    const pattern2 = new Pattern({
      valenceUnits: [aNPObj, bNPObj, cNPExt],
    });
    await pattern2.save();
    const pattern3 = new Pattern({
      valenceUnits: [aNPObj, bNPObj],
    });
    await pattern3.save();
    const pattern4 = new Pattern({
      valenceUnits: [aNPObj, bNPObj, cNPExt, dPPaboutExt],
    });
    await pattern4.save();
    const pattern5 = new Pattern({
      valenceUnits: [aNPObj, cNPExt, dPPaboutExt],
    });
    await pattern5.save();
    const pattern6 = new Pattern({
      valenceUnits: [aNPObj, bNPObj, aNPObj, cNPExt],
    });
    await pattern6.save();
    const pattern7 = new Pattern({
      valenceUnits: [bNPObj, bNPObj, cNPExt],
    });
    await pattern7.save();
  });
  after(() => {
    mongoose.disconnect();
    mockgoose.reset();
  });
  it('#getPatterns should return the correct number of patterns when processing FE.PT.GF combinations', async () => {
    const patterns = await getController.getPatterns([['A', 'NP', 'Obj'], ['B', 'NP', 'Obj']], false, true);
    patterns.length.should.equal(4);
  });
  it('#getPatterns should return the correct number of patterns when processing long FE.PT.GF combinations', async () => {
    const patterns = await getController.getPatterns([['A', 'NP', 'Obj'], ['B', 'NP', 'Obj'], ['C', 'NP', 'Ext'], ['D', 'PP[about]', 'Ext']], false, true);
    patterns.length.should.equal(1);
  });
  it('#getPatterns should return the correct number of patterns when processing FE PT.GF', async () => {
    const patterns = await getController.getPatterns([['A'], ['NP', 'Ext']], false, true);
    patterns.length.should.equal(4);
  });
  it('#getPatterns should return the correct number of patterns when processing FE combinations', async () => {
    const patterns = await getController.getPatterns([['D'], ['A']], false, true);
    patterns.length.should.equal(3);
  });
  it('#getPatterns should return the correct number of patterns when processing single PT', async () => {
    const patterns = await getController.getPatterns([['NP']], false, true);
    patterns.length.should.equal(7);
  });
  it('#getPatterns should return the correct number of patterns when processing PT GF', async () => {
    const patterns = await getController.getPatterns([['NP'], ['Obj']], false, true);
    patterns.length.should.equal(6);
  });
  it('#getPatterns should return the correct number of patterns when processing PT GF PT', async () => {
    const patterns = await getController.getPatterns([['NP'], ['Obj'], ['NP']], false, true);
    patterns.length.should.equal(4);
  });
  it('#getPatterns should return the correct number of patterns when processing up to two PT.GF', async () => {
    const patterns = await getController.getPatterns([['NP', 'Obj'], ['NP', 'Obj']], false, true);
    patterns.length.should.equal(5);
  });
  it('#getPatterns should return the correct number of patterns when processing up to three PT.GF', async () => {
    const patterns = await getController.getPatterns([['NP', 'Obj'], ['NP', 'Obj'], ['NP', 'Obj']], false, true);
    patterns.length.should.equal(1);
  });
  it('#getPatterns should return the correct number of patterns when processing FE PT GF', async () => {
    const patterns = await getController.getPatterns([['A'], ['PP[about]'], ['Ext']], false, true);
    patterns.length.should.equal(2);
  });
  it('#getPatterns should return the correct number of patterns when processing long tokenArrays', async () => {
    const patterns = await getController.getPatterns([['Ext'], ['NP'], ['NP'], ['NP']], false, true);
    patterns.length.should.equal(2);
  });
  it('#getPatterns should return the correct number of patterns when querying strictVUMatching', async () => {
    const patterns = await getController.getPatterns([['A', 'NP', 'Obj'], ['B', 'NP', 'Obj'], ['C', 'NP', 'Ext']], true, true);
    patterns.length.should.equal(1);
  });
});
