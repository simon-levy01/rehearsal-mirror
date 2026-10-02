export const questions = [
 ['Personal assistant','Two appointments overlap unexpectedly. How would you resolve the calendar conflict while keeping everyone informed?'],
 ['Personal assistant','Tell me about a time you handled confidential information and protected someone’s privacy.'],
 ['Personal assistant','Your manager needs travel rearranged at short notice. How would you check options and communicate changes?'],
 ['Personal assistant','Describe how you would prioritise several urgent requests from different people.'],
 ['Customer support','Tell me about a time you listened to an upset customer and helped resolve their complaint.'],
 ['Customer support','A customer reports a problem you cannot solve alone. How would you investigate and hand it over?'],
 ['Customer support','How would you explain a complicated process to someone unfamiliar with it?'],
 ['Customer support','Describe a time you followed up with someone to make sure their issue was actually resolved.'],
 ['Administration','Tell me about a time you found and corrected an error in a spreadsheet or record.'],
 ['Administration','How would you organise incoming documents so colleagues can find the correct version?'],
 ['Administration','Describe a routine task you made more reliable or easier to complete.'],
 ['Administration','A deadline is approaching and information is missing. How would you coordinate the next steps?']
].map(([role,text],id)=>({id,role,text}));
export const fields=['situation','task','action','result'];
export const storyText=s=>[s.title,...fields.map(f=>s[f])].filter(Boolean).join('. ');
export const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
export function rankStories(stories,vectors,query){return stories.map((story,i)=>({story,similarity:dot(vectors[i],query)})).sort((a,b)=>b.similarity-a.similarity);}
export const emptyState=()=>({version:1,stories:[],answers:{},question:0,duration:60});
export function validateState(value){
 if(!value||value.version!==1||!Array.isArray(value.stories)||value.stories.length>40||!value.answers||typeof value.answers!=='object'||Array.isArray(value.answers))throw Error('Expected a Rehearsal Mirror version 1 backup with up to 40 cards.');
 const clean=emptyState(); const ids=new Set();
 clean.stories=value.stories.map(s=>{if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id))throw Error('Invalid or duplicate card identifier.');ids.add(s.id); const card={id:s.id};for(const f of ['title',...fields]){if(typeof s[f]!=='string'||s[f].length>3000)throw Error('Card fields must be text of at most 3,000 characters.');card[f]=s[f];}return card;});
 for(const [k,v]of Object.entries(value.answers)){if(!questions.some(q=>String(q.id)===k)||typeof v!=='string'||v.length>12000)throw Error('Invalid answer field.');clean.answers[k]=v;}
 clean.question=Number.isInteger(value.question)&&questions[value.question]?value.question:0;clean.duration=value.duration===90?90:60;return clean;
}
export class PracticeTimer{
 constructor(seconds,now=()=>performance.now()){this.now=now;this.reset(seconds);}
 reset(seconds){this.remaining=seconds*1000;this.running=false;this.deadline=0;}
 start(){if(this.remaining>0&&!this.running){this.running=true;this.deadline=this.now()+this.remaining;}}
 tick(){if(this.running){this.remaining=Math.max(0,this.deadline-this.now());if(!this.remaining)this.running=false;}return Math.ceil(this.remaining/1000);}
 pause(){this.tick();this.running=false;}
}
