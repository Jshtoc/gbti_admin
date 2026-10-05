import type { RoomCategoryTime } from '@gbti/db';

import { BarList } from './BarList';
import styles from './RoomCategoryBars.module.css';

interface RoomCategoryBarsProps {
  categories: RoomCategoryTime[];
}

const KIND_LABEL: Record<RoomCategoryTime['kind'], string> = {
  game: '게임',
  keyword: '방제목',
  unknown: '미표시',
};

/** 방 종류별 체류 시간 (가로 막대) + 분류 기준 안내 */
export function RoomCategoryBars({ categories }: RoomCategoryBarsProps) {
  const total = categories.reduce((sum, c) => sum + c.seconds, 0);

  return (
    <>
      <BarList
        ranked
        emptyText="이 기간에 음성 채널 기록이 없습니다."
        items={categories.map((c) => ({
          key: `${c.kind}-${c.label}`,
          value: c.seconds,
          label: (
            <>
              <span className={styles.name}>{c.label}</span>
              <span className={styles.kind} data-kind={c.kind}>
                {KIND_LABEL[c.kind]}
              </span>
              <span className={styles.share}>{total > 0 ? Math.round((c.seconds / total) * 100) : 0}%</span>
            </>
          ),
        }))}
      />
      <p className={styles.rule}>
        방 제목에 <b>할하·할거·각자</b>가 있으면 <b>할하방</b>, 아니면 방 안에서 게임 상태가 보이는 멤버의 게임(여러 개면 가장 많이 하는
        게임), 아무 정보도 없으면 <b>정보미표시방</b>으로 분류합니다.
      </p>
    </>
  );
}
