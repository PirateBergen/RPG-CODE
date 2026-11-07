const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../reliability.js'),'utf8');let timer,listener,writes=[];
const ref={key:'request',off(){},on(event,cb){listener=cb}};
const ctx=vm.createContext({window:{},Date,Set,Error,AbortController,db:{ref(){return {push(){return ref}}}},setTimeout(fn){timer=fn;return 1},clearTimeout(){},persistenceRevision:'session'});
vm.runInContext(source.slice(0,source.indexOf('async function claimReservedHero')),ctx);
vm.runInContext('reliablePut=async(path,value)=>{writes.push({path,value})}',Object.assign(ctx,{writes}));
const results=[];async function test(name,fn){await fn();results.push(name)}
(async()=>{
await test('Hors ligne : la demande n’est pas envoyée',async()=>{assert.throws(()=>vm.runInContext('submitReliableAction("combatRequests",{})',ctx),/Action non envoyée/);assert.equal(writes.length,0)});
vm.runInContext('window.__actionOnline=true;window.__authUid="g"',ctx);
await test('Refus confirmé : explication distincte du résultat incertain',async()=>{const promise=vm.runInContext('submitReliableAction("combatRequests",{})',ctx);await Promise.resolve();listener({val:()=>({status:'failed',error:'Ce n’est pas votre tour'})});await assert.rejects(promise,/Action refusée.*Ce n’est pas votre tour/)});
await test('Délai : annulation conditionnée par les règles, aucune relance',async()=>{writes.length=0;const promise=vm.runInContext('submitReliableAction("combatRequests",{})',ctx);await Promise.resolve();await timer();await assert.rejects(promise,/Résultat non confirmé.*journal/);assert.equal(writes.length,2);assert.equal(writes[1].value,"cancelled")});
await test('Action confirmée : résultat exact retourné',async()=>{const promise=vm.runInContext('submitReliableAction("combatRequests",{})',ctx);await Promise.resolve();listener({val:()=>({status:'done',result:{amount:12}})});assert.equal((await promise).amount,12)});
console.log(JSON.stringify({passed:results.length,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
