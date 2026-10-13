import {notFound} from 'next/navigation';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CourseBuilderPrototype} from '@/components/course-builder-prototype/CourseBuilderPrototype';
import {reviewBundle} from '@/lib/experiences/builder/prototype/review-snapshot';
export const dynamic='force-dynamic';
export const metadata={title:'Hub Leader Cohort · Local Builder Review',robots:{index:false,follow:false}};
export default async function HubReview(){
 if(process.env.NODE_ENV==='production')notFound();
 const root=join(process.cwd(),'.local/course-review');
 const [snapshot,resources,manifest,assessments]=await Promise.all(['hub-leader-published.json','hub-leader-resources.json','asset-manifest.json','hub-leader-assessments.json'].map(async name=>JSON.parse(await readFile(join(root,name),'utf8'))));
 return <CourseBuilderPrototype review={reviewBundle(snapshot,resources,manifest,assessments)}/>;
}
