import type { RoomCategoryTime } from '@gbti/db';

import { BarList } from './BarList';
import styles from './RoomCategoryBars.module.css';

interface RoomCategoryBarsProps {
  categories: RoomCategoryTime[];
}

const KIND_LABEL: Record<RoomCategoryTime['kind'], string> = {
  game: '게임',
  hangout: '방제목·여러 게임',
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
        방 제목에 <b>할하·할거·각자</b>가 있거나(띄어쓰기·기호 무시) 방 안에서 <b>서로 다른 게임이 2개 이상</b> 보이면{' '}
        <b>할하방</b>, 게임이 하나면 그 게임, 아무 정보도 없으면 <b>정보미표시방</b>으로 분류합니다.
      </p>
    </>
  );
}
