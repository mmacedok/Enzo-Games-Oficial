import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../assets/italos-surfer/vendor/three.mjs';
import {createPattern,makeRng} from '../assets/italos-surfer/core.mjs';
const assetBase=new URL('../assets/italos-surfer/',import.meta.url);
test('obstacle rows never duplicate a lane and always offer a way through',()=>{const rng=makeRng(273);for(let i=0;i<2000;i++){const p=createPattern(i,100,rng);assert.equal(new Set(p.items.map(o=>o.lane)).size,p.items.length);assert.ok(p.items.every(o=>o.lane!==p.safeLane));}});
test('all exported 3D assets actually load, characters contain usable animation tracks',()=>{const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',assetBase)));for(const asset of manifest.assets.filter(a=>a.path.endsWith('.json'))){const object=new T.ObjectLoader().parse(JSON.parse(fs.readFileSync(new URL(asset.path,assetBase))));assert.ok(object.isObject3D);let meshes=0;object.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.count>0);}});assert.ok(meshes>0,asset.id);if(['italo','enzo'].includes(asset.id)){assert.equal(object.animations.length,4);for(const clip of object.animations)assert.ok(clip.tracks.length>0);}}});
test('exported sound files contain valid PCM sample data',()=>{const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',assetBase)));for(const asset of manifest.assets.filter(a=>a.path.endsWith('.wav'))){const b=fs.readFileSync(new URL(asset.path,assetBase));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt32LE(40),b.length-44);}});
