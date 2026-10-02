import {pipeline,env} from '@huggingface/transformers';
import {fields,storyText,rankStories,dot} from './core.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
// Ship the trusted runtime with the static app, rather than fetch a CDN script.
env.backends.onnx.wasm.wasmPaths={
 mjs:new URL('../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs',import.meta.url).href,
 wasm:new URL('../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm',import.meta.url).href
};
let extractor;
const MODEL='Xenova/all-MiniLM-L6-v2';
const REVISION='751bff37182d3f1213fa05d7196b954e230abad9';
self.onmessage=async({data})=>{
 try{
  if(data.type==='load'){
   extractor=await pipeline('feature-extraction',MODEL,{revision:REVISION,device:'wasm',dtype:'q8',progress_callback:p=>self.postMessage({type:'progress',progress:p})});
   self.postMessage({type:'ready'});
  }else if(data.type==='rank'){
   if(!extractor)throw Error('Model is not loaded. Use manual cards.');
   const texts=[data.question,...data.stories.map(storyText)];
   const vectors=(await extractor(texts,{pooling:'mean',normalize:true})).tolist();
   const ranked=rankStories(data.stories,vectors.slice(1),vectors[0]).slice(0,3);
   const results=[];
   for(const {story}of ranked){
    const excerpts=fields.filter(f=>story[f].trim()).map(f=>({field:f,text:story[f]}));
    let excerpt=excerpts[0]||{field:'title',text:story.title};
    if(excerpts.length){const v=(await extractor(excerpts.map(e=>e.text),{pooling:'mean',normalize:true})).tolist();excerpt=excerpts.map((e,i)=>({...e,similarity:dot(vectors[0],v[i])})).sort((a,b)=>b.similarity-a.similarity)[0];}
    results.push({id:story.id,title:story.title,excerpt:{field:excerpt.field,text:excerpt.text}});
   }
   self.postMessage({type:'ranked',requestId:data.requestId,results,dimensions:vectors[0].length});
  }
 }catch(e){self.postMessage({type:'error',requestId:data.requestId,message:String(e.message||e)});}
};
