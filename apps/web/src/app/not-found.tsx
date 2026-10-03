import Link from 'next/link';

import { PageHero } from '@/components/ui/PageHero';

export default function NotFound() {
  return (
    <div className="container">
      <PageHero
        eyebrow="404"
        title="Not found"
        description={
          <>
            멤버를 찾을 수 없습니다. 서버를 나간 멤버일 수 있습니다. <Link href="/">← Overview</Link>
          </>
        }
      />
    </div>
  );
}
