import { getPlatformAccount } from '@/lib/platform/auth';
import { BridgesBarriersAssessment } from './BridgesBarriersAssessment';
export async function BridgesBarriersEntry(props: Parameters<typeof BridgesBarriersAssessment>[0]) { const account = props.preview ? null : await getPlatformAccount(); return <BridgesBarriersAssessment {...props} participantName={account?.displayName}/>; }
