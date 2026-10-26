import { getPlatformAccount } from '@/lib/platform/auth';
import { MicrochurchAssessment } from './MicrochurchAssessment';
export async function MicrochurchEntry(props: Parameters<typeof MicrochurchAssessment>[0]) { const account = props.preview ? null : await getPlatformAccount(); return <MicrochurchAssessment {...props} participantName={account?.displayName}/>; }
