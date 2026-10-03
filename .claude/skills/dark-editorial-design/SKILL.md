---
name: dark-editorial-design
description: 다크 에디토리얼(dvdrod-inspired) 웹 디자인 시스템. 랜딩 페이지, 매뉴얼/가이드 페이지, 단일 HTML 포트폴리오/소개 페이지처럼 "감각적이고 모던한 다크 테마 사이트"를 만들거나 리디자인할 때 이 스킬을 사용한다. 컬러 토큰, 타이포그래피, 카드/모달/라이트박스/마퀴 컴포넌트, 스크롤 리빌 애니메이션, 필름 그레인 텍스처 등 재사용 가능한 CSS 패턴을 포함한다.
---

# Dark Editorial Design System

출처: GBTI 게임 매뉴얼 사이트(`index.html`)에서 추출한 다크·에디토리얼 스타일. 잡지 레이아웃 + 브루탈리즘 타이포 + 미세한 노이즈 텍스처를 결합한, 바닐라 HTML/CSS/JS(프레임워크 불필요) 기반 스타일이다.

이 스킬을 적용할 때는 아래 토큰과 컴포넌트 레시피를 "그대로 복붙"하지 말고, 대상 프로젝트의 콘텐츠·브랜드 컬러에 맞게 치환해서 쓴다. 단, 비율/간격/모션의 "느낌"은 최대한 유지한다.

## 언제 이 스타일을 쓰는가

- 소개/매뉴얼/가이드/one-pager 성격의 정적 페이지
- "고급스럽고 editorial한 다크 테마"를 원할 때 (밝고 발랄한 SaaS 톤이 아닌 경우)
- 리스트형 메뉴/목차를 카드 형태로 보여줘야 할 때
- 이미지 확대보기(라이트박스), 간단한 모달, 안내문이 필요한 단일 페이지

가벼운 멀티페이지 대시보드나 데이터 중심 앱에는 과한 스타일이니 적합하지 않다.

## 디자인 철학 (핵심 원칙)

1. **거의 검정 배경 + 오프화이트 텍스트** — 순수 블랙(#000)이나 순수 화이트가 아닌, 살짝 톤 다운된 블랙/화이트를 쓴다. 눈부심을 줄이고 고급스러운 느낌을 낸다.
2. **디스플레이 폰트는 과감하게, 본문은 절제되게** — 헤드라인은 굵고 타이트한 트래킹(음수 letter-spacing)의 지오메트릭 산세리프, 본문/라벨은 작고 절제된 폭 넓은 트래킹(양수 letter-spacing, 업퍼케이스)을 대비시킨다.
3. **단색 + 원 포인트 악센트** — 그레이스케일 팔레트에 악센트 컬러(오렌지-레드 계열) 하나만 강하게 쓴다. 성공/실패를 나타낼 때만 보조로 green을 추가한다.
4. **보더는 거의 투명하게** — 카드 구분선은 `rgba(fg, 0.08~0.12)` 수준의 아주 옅은 흰색 보더로, hover 시에만 진해진다. 그림자(box-shadow)보다 보더로 구조를 만든다.
5. **미세한 텍스처** — 전체 화면에 아주 낮은 opacity(2~4%)의 필름 그레인 노이즈를 깔아 플랫함을 깬다.
6. **절제된 모션** — 스크롤 시 카드가 순차적으로 fade+slide-up 등장, hover 시 화살표 아이콘이 45도 회전하며 색이 채워지는 등 "작지만 디테일한" 인터랙션 위주. 화려한 애니메이션은 지양.
7. **단일 컬럼, 좁은 본문 폭** — `max-width: 680px` 전후의 좁은 컨테이너로 가독성과 editorial한 느낌을 유지한다.

## 디자인 토큰 (CSS Custom Properties)

```css
:root {
  --bg:        #0C0C0B;   /* 페이지 배경 (거의 블랙) */
  --bg2:       #141413;   /* 카드/모달 배경 (bg보다 한 단계 밝음) */
  --fg:        #EDEDE8;   /* 본문 텍스트 (거의 화이트) */
  --muted:     #93938F;   /* 보조 텍스트, 라벨 */
  --border:        rgba(237,237,232,0.10); /* 기본 보더 */
  --border-hover:  rgba(237,237,232,0.34); /* hover 보더 */
  --accent:    #FF3D00;   /* 메인 악센트 (CTA, 포인트) */
  --accent2:   #FF7A5C;   /* 악센트 라이트 변형 (텍스트용) */
  --good:      #00C96B;   /* 긍정/성공 */
  --good2:     #6EE7B7;   /* 긍정 라이트 변형 */
  --radius:    18px;      /* 카드 기본 radius */
  --transition: 0.35s cubic-bezier(0.25,0.46,0.45,0.94);
}
```

다른 프로젝트에 적용할 때: `--accent`만 브랜드 컬러로 바꾸면 톤이 유지된 채 색만 바뀐다. 배경/텍스트 톤(`--bg`, `--bg2`, `--fg`, `--muted`)은 그대로 가져가는 것을 권장한다.

## 타이포그래피

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@500;700;900&display=swap" rel="stylesheet" />
```

- **디스플레이 (헤드라인, 큰 숫자, 섹션 타이틀)**: `'Syne', sans-serif` — 지오메트릭하고 개성 있는 폰트. 800 weight.
- **본문/UI**: `'Inter', 'Noto Sans KR', system-ui, sans-serif` — 한글이 섞일 경우 Noto Sans KR을 폴백으로. 500~700 weight 위주, 400은 거의 안 씀(본문도 500으로 약간 두껍게).
- 영문 전용이 아니라면 Syne은 라틴 전용 폰트이므로 한글 헤드라인에는 자동 폴백되어 Noto Sans KR 900이 쓰이게 스택을 짜준다 (`font-family: 'Syne', 'Noto Sans KR', sans-serif;`).

규칙:
- 큰 헤드라인: `clamp(56px, 15vw, 108px)`처럼 뷰포트에 반응하는 거대한 크기 + `letter-spacing: -0.04em` + `line-height: 0.92` (타이트하게 눌러서 임팩트를 줌)
- 라벨/이이브로우(eyebrow)/뱃지: 10~11px, 600~700 weight, `letter-spacing: 0.08~0.16em`, `text-transform: uppercase`, 색상은 `--muted`
- 본문 설명: 13~14px, 500 weight, `line-height: 1.6~1.7`, 색상은 `--muted` (fg는 제목에만 집중)

## 레이아웃 셸

```css
body {
  background-color: var(--bg);
  color: var(--fg);
  font-family: 'Inter', 'Noto Sans KR', system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px 60px;
  overflow-x: hidden;
}

.container {
  width: 100%;
  max-width: 680px; /* editorial한 좁은 폭. 콘텐츠 많으면 760~840px까지만 */
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}
```

## 컴포넌트 레시피

### 1. 필름 그레인 텍스처 (전체 배경 질감)

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  opacity: 0.03; /* 2~4% 사이로, 눈에 띄지 않을 정도만 */
  pointer-events: none;
  z-index: 1;
}
```
SVG `feTurbulence`를 data URI로 inline하면 별도 이미지 에셋 없이 노이즈 텍스처를 얻을 수 있다.

### 2. Hero (히어로 섹션)

구성: 작은 업퍼케이스 eyebrow → 거대한 타이틀 → 짧은 설명 → 상태를 나타내는 pill 뱃지(점멸 dot 포함).

```html
<header class="hero">
  <p class="hero-eyebrow">Category Label</p>
  <h1 class="hero-title">TITLE</h1>
  <p class="hero-desc">한두 줄의 짧은 소개 문구.</p>
  <div class="hero-pill"><span class="hero-pill-dot"></span>상태 텍스트</div>
</header>
```

```css
.hero-pill-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: blink 2.2s ease infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
```

### 3. 마퀴(Marquee) 구분선

보더-투-보더로 가로지르는 무한 스크롤 키워드 띠. 섹션 전환부나 히어로 아래에 장식 겸 네비게이션 힌트로 쓴다.

```css
.marquee-wrap {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 13px 0;
  overflow: hidden;
  white-space: nowrap;
}
.marquee-track { display: inline-flex; animation: mq 22s linear infinite; }
.mq-item {
  font-family: 'Syne', sans-serif;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted);
  padding: 0 22px;
}
.mq-item::after { content: '✦'; font-size: 7px; color: var(--accent); margin-left: 44px; }
@keyframes mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
```
중요: 트랙 안의 아이템 목록을 **정확히 2벌 복제**해서 넣어야 `-50%` 이동 시 끊김 없이 루프된다.

### 4. 카드형 메뉴 리스트 (가장 핵심 컴포넌트)

목차/메뉴/링크 목록을 버튼 카드로 표현. 좌측 라벨 pill + 타이틀, 우측 원형 화살표 아이콘.

```html
<button class="menu-item">
  <span class="menu-body">
    <span class="menu-label">카테고리</span>
    <span class="menu-title">항목 제목</span>
  </span>
  <span class="menu-arrow">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12L12 2M12 2H4M12 2V10"/>
    </svg>
  </span>
</button>
```

```css
.menu-item {
  width: 100%;
  background-color: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 18px 18px 22px;
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer;
  transition: opacity 0.6s ease, transform 0.6s ease, border-color 0.3s ease, background 0.3s ease;
}
.menu-item:hover { border-color: var(--border-hover); background: #1a1a18; }
.menu-item:active { transform: scale(0.99); }

.menu-arrow {
  width: 38px; height: 38px;
  border: 1px solid var(--border);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--muted);
  transition: background 0.3s, border-color 0.3s, transform 0.3s, color 0.3s;
}
.menu-item:hover .menu-arrow {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transform: rotate(45deg); /* → 모양 화살표가 ↗로 회전 */
}
```

섹션 구분은 `sh-eyebrow`(작은 영문 라벨) + `sh-title`(실제 제목) 조합 + 하단 보더 한 줄로 처리한다.

### 5. 스크롤 리빌 애니메이션 (순차 등장)

```css
.menu-item { opacity: 0; transform: translateY(14px); }
.menu-item.in-view { opacity: 1; transform: translateY(0); }
```
```js
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.menu-item').forEach((el, i) => {
  el.style.transitionDelay = Math.min(i * 40, 300) + 'ms'; // 순차 stagger, 최대 300ms로 캡
  revealObserver.observe(el);
});
```
반드시 `prefers-reduced-motion`을 존중할 것:
```css
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
  .hero-pill-dot { animation: none; }
  .menu-item { opacity: 1; transform: none; transition: none; }
}
```

### 6. 모달 / 다이얼로그

오버레이는 거의 불투명한 블랙(`rgba(0,0,0,0.8~0.95)`), 내부 카드는 `--bg2` + 둥근 radius 24px, 닫기 버튼은 우상단 고정 원형.

```css
#modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; padding: 24px 16px; }
#modal.open { display: flex; }
#modal-inner {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 28px 24px 24px;
  max-width: 480px; width: 100%;
  max-height: 88vh; overflow-y: auto;
}
#modal-close {
  position: absolute; top: 16px; right: 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border);
  border-radius: 50%; width: 40px; height: 40px;
}
#modal-close:hover { background: var(--fg); color: var(--bg); }
```
배경 클릭 시 닫히고 내부 클릭은 `event.stopPropagation()`으로 막는 패턴, `Escape` 키로 전체 모달/라이트박스 닫기를 한 핸들러에서 처리.

### 7. 이미지 라이트박스

전체화면 블랙(0.95) 오버레이 + 중앙 정렬 이미지. 모바일에서는 가로 스크롤이 필요한 넓은 이미지를 위해 좌우 스와이프 힌트(흔들리는 pill)를 보여주고, 스크롤이 감지되면 자동으로 사라지게 한다 (`#lb-scroll-hint`, `hint-sway` 애니메이션).

### 8. Good / Bad 예시 박스

Do/Don't, 올바른 예시/금지 예시를 보여줄 때 초록/오렌지 톤의 반투명 배경+보더로 구분.

```css
.example-box { border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; }
.example-box.good { background: rgba(0,201,107,0.10); border: 1.5px solid rgba(0,201,107,0.4); }
.example-box.bad  { background: rgba(255,61,0,0.10);  border: 1.5px solid rgba(255,61,0,0.4); }
.example-box.good .example-label { color: var(--good2); }
.example-box.bad  .example-label { color: var(--accent2); }
```

## 적용 체크리스트

새 프로젝트/페이지에 이 스타일을 입힐 때:

1. `--bg`, `--bg2`, `--fg`, `--muted`, `--border*` 토큰을 그대로 가져온다.
2. `--accent`만 프로젝트 브랜드 컬러로 교체한다 (오렌지가 안 맞으면 바꿔도 톤은 유지됨).
3. Syne + Inter(+ 필요시 Noto Sans KR) 폰트를 로드한다.
4. 컨테이너 폭은 콘텐츠 밀도에 따라 680~840px 사이로 고정한다.
5. 리스트형 콘텐츠는 무조건 "라벨 pill + 타이틀 + 원형 화살표" 카드 패턴을 우선 검토한다.
6. 필름 그레인 오버레이, 스크롤 리빌, hover 시 화살표 회전 — 이 세 가지는 저비용으로 "다듬어진 느낌"을 가장 크게 올려주는 디테일이므로 빠뜨리지 않는다.
7. `prefers-reduced-motion` 대응을 잊지 않는다.
8. 프레임워크가 있는 프로젝트라면 위 CSS를 컴포넌트/유틸리티 클래스로 그대로 이식 가능 (Tailwind라면 토큰을 `theme.extend.colors`에 매핑).

## 참고 원본

전체 레퍼런스 구현은 `C:\Users\admin\gbti_manual\index.html` (GBTI 게임 매뉴얼 페이지) 참고.
