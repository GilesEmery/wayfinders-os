import assert from 'node:assert/strict';
import {test} from 'node:test';
import {shouldRelinkExternalResource} from './media-source.ts';
test('saving native file metadata does not replace its attachment with a stale URL',()=>{
 for(const kind of ['image','document','download']){
  assert.equal(shouldRelinkExternalResource(kind,{url:'https://old.example/file.pdf',title:'Old'},{url:'https://old.example/file.pdf',title:'New'}),false);
  assert.equal(shouldRelinkExternalResource(kind,{},{title:'New'}),false);
  assert.equal(shouldRelinkExternalResource(kind,{url:'https://old.example/file.pdf'},{url:'https://new.example/file.pdf'}),true);
 }
});
test('video and external-link URL resource handling remains unchanged',()=>{
 for(const kind of ['video','external_link'])assert.equal(shouldRelinkExternalResource(kind,{url:'https://example.org'},{url:'https://example.org'}),true);
});
