import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBlockConfiguration} from './block-registry.ts';
import {CALLOUT_STYLES} from './callout-styles.ts';
test('all nine callout styles accept visibility and border controls',()=>{
 assert.equal(CALLOUT_STYLES.length,9);
 for(const style of CALLOUT_STYLES)for(const borderStyle of ['left','outline','none']){
  const result=parseBlockConfiguration('callout',{title:style.label,body:'Body',treatment:'info',calloutStyle:style.id,showIcon:false,showTitle:false,borderStyle});
  assert.equal(result.ok,true);if(result.ok){assert.equal(result.value?.calloutStyle,style.id);assert.equal(result.value?.showIcon,false);assert.equal(result.value?.showTitle,false);}
 }
});
test('legacy callouts remain valid without converting their appearance',()=>{
 for(const treatment of ['info','emphasis','warning','success']){const result=parseBlockConfiguration('callout',{title:'Original',body:'Unchanged',treatment});assert.equal(result.ok,true);if(result.ok){assert.equal(result.value?.calloutStyle,undefined);assert.equal(result.value?.showIcon,undefined);}}
});
test('unknown styles, border modes and non-boolean toggles are rejected',()=>{
 const base={body:'Body',treatment:'info'};
 for(const patch of [{calloutStyle:'arbitrary'},{borderStyle:'script'},{showIcon:'false'},{showTitle:0}])assert.equal(parseBlockConfiguration('callout',{...base,...patch}).ok,false);
});
