/**
 * DB 작업을 받은 순서대로 하나씩 실행한다.
 * 음성 퇴장→입장처럼 빠르게 연달아 오는 이벤트가 섞여 기록되지 않게 하기 위해서.
 * 한 작업이 실패해도 로그만 남기고 다음 작업은 계속한다.
 */
export function createSerialQueue() {
  let tail: Promise<void> = Promise.resolve();
  let pending = 0;

  function enqueue(label: string, task: () => Promise<void>): Promise<void> {
    pending++;
    const run = tail.then(task).catch((error: unknown) => {
      console.error(`[queue] ${label} 실패:`, error);
    }).finally(() => {
      pending--;
    });
    tail = run;
    return run;
  }

  /** 남은 작업이 모두 끝날 때까지 기다린다 (종료 시) */
  const drain = () => tail;

  return { enqueue, drain, size: () => pending };
}
