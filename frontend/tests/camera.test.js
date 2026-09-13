import test from 'node:test';
import assert from 'node:assert/strict';
import {flightProgress} from '../src/aircraft-camera.js';

test('camera journey has one strictly progressing curve with no intermediate stop',()=>{
  let previous=-1;
  for(let ms=0;ms<=1600;ms+=16) {
    const {eased}=flightProgress(ms);
    assert.ok(eased>previous);
    previous=eased;
  }
  assert.deepEqual(flightProgress(0),{t:0,eased:0});
  assert.deepEqual(flightProgress(1600),{t:1,eased:1});
  assert.deepEqual(flightProgress(3200),{t:1,eased:1});
});
