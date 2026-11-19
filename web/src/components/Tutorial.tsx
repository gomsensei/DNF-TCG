import {LESSONS,lessonComplete,type LessonId} from '../tutorial/lessons.ts';
import {previewChoices,type Explanation,actionKey} from '../tutorial/explain.ts';
import type {Action,Game} from '../engine/game.ts';

export function TutorialGuide({game,lesson,guided,autoPause,onMode,onLesson}:{game:Game;lesson:LessonId;guided:boolean;autoPause:boolean;onMode:(v:boolean)=>void;onLesson:(id:LessonId)=>void}) {
  const at=LESSONS.findIndex(l=>l.id===lesson),current=LESSONS[at],complete=lessonComplete(lesson,game);
  return <section className="tutorial-guide" aria-label="튜토리얼 안내">
    <div className="guide-heading"><div className="mode-switch" role="group" aria-label="관전 방식"><button className={guided?'active':''} onClick={()=>onMode(true)}>장면별 튜토리얼</button><button className={!guided?'active':''} onClick={()=>onMode(false)}>자유 관전</button></div><small>{guided?'고정 배치 · 이후 판정은 실제 엔진':'시드로 시작하는 전체 대전'}</small></div>
    {guided?<><div className="lesson-steps" role="group" aria-label="학습 장면">{LESSONS.map((l,i)=><button key={l.id} aria-pressed={lesson===l.id} onClick={()=>onLesson(l.id)}><b>{i+1}</b>{['소환','사냥','성장','파티','방어','정예 보상','재건'][i]}</button>)}</div><div className="lesson-objective"><div><h2>{at+1}. {current.title}</h2><p>{complete?current.takeaway:current.question}</p></div>{complete&&<button className="secondary-button" onClick={()=>onLesson(LESSONS[(at+1)%LESSONS.length].id)}>{at===LESSONS.length-1?'처음 장면으로':'다음 장면 →'}</button>}</div></>:<p className="free-guide">사냥으로 수입을 만들고, 남은 동료로 결투하고, 운영과 성장에 자원을 배분하는 흐름을 관찰하세요.</p>}
    <details className="roadmap"><summary>구현 로드맵 · 1–4단계 사용 가능</summary><ol><li>선택 해설 — 실제 봇 평가에 따른 이유·대가·전후 변화</li><li>장면 학습 — 7개 고정 장면과 {autoPause?'핵심 행동 뒤 자동 정지':'직접 재생 제어'}</li><li>대안 비교 — 같은 행동 직전으로 돌아가 다른 선택으로 분기</li><li>개선 실험 — 원본·정예 던전·재건 지원·결합 규칙 비교</li><li className="future-stage">다음 검증 — 사람의 이해도·재대전 의향·상품 구매 효용과 콘텐츠 확장. 아직 검증 전입니다.</li></ol></details>
  </section>;
}

export function DecisionBubble({explanation,upcoming,branched}:{explanation:Explanation;upcoming:boolean;branched:boolean}) {
  const e=explanation;
  return <section className={`decision-bubble speaker-${e.player}`} aria-label="카드 선택 해설" aria-live="polite"><div className="bubble-heading"><span className="speaker-label">{e.player?'B':'A'} · {e.name}</span><small>{upcoming?'다음 봇 선택 미리보기':branched&&!e.recommended?'직접 고른 대안':e.kind==='rule'?'규칙 진행':'봇의 선택'} · {e.recommended?'기본 봇 추천':'합법적 대안'}</small></div><h3>“{e.label}”</h3><div className="bubble-reasons"><p><b>왜 이 선택인가</b>{e.reason}</p><p><b>무엇을 포기하나</b>{e.tradeoff}</p></div><div className="actual-change"><b>{upcoming?'선택하면 생기는 즉시 변화':'실제 변화'}</b>{e.result}</div><small className="heuristic-note">{e.evaluation} · 휴리스틱 점수이며 승률이 아닙니다.</small></section>;
}

export function ChoiceComparison({before,at,chosen,onBranch,onRestore,branched}:{before:Game;at:number;chosen?:Action;onBranch:(a:Action)=>void;onRestore:()=>void;branched:boolean}) {
  const options=previewChoices(before);
  if(!options.length)return null;
  return <section className="choice-panel"><details><summary>다른 선택이었다면? <small>행동 {at+1} 직전</small></summary><p>같은 상태에서 한 행동만 비교합니다. 이후 승패는 아직 모릅니다.</p><div className="choice-options">{options.map(c=><article key={actionKey(c.action)} className={chosen&&actionKey(chosen)===actionKey(c.action)?'chosen':''}><div><small>{c.rank===1?'기본 봇 추천':`후보 ${c.rank}`}{chosen&&actionKey(chosen)===actionKey(c.action)?' · 현재 선택':''}</small><h4>{c.label}</h4></div><p>{c.explanation.result}</p><p className="choice-cost">{c.explanation.tradeoff}</p><button className="secondary-button" onClick={()=>onBranch(c.action)}>이 선택으로 이어보기</button></article>)}</div>{branched&&<button className="secondary-button" onClick={onRestore}>원래 장면 처음으로</button>}</details></section>;
}
